from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.gis.geos import Point
from .models import Route
from .serializers import RouteSerializer, RouteRequestSerializer
from .services import GoogleMapsService
from ai_services.services import GeminiService
from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
import os
import google.generativeai as genai
from rest_framework.permissions import AllowAny # Consider stricter permissions in production
from dotenv import load_dotenv

load_dotenv(override=True) # Load environment variables from .env

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class GeminiInsightsView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data
        start_location = data.get('start_location')
        end_location = data.get('end_location')
        distance = data.get('distance')
        duration = data.get('duration') 
        traffic_info = data.get('traffic_info')
        weather_info = data.get('weather_info')
        avoid_highways = data.get('avoid_highways', False)
        avoid_tolls = data.get('avoid_tolls', False)
        transport_mode = data.get('transport_mode', 'driving')
        current_time = data.get('current_time', 'N/A')

        if not all([start_location, end_location, distance, duration]):
            return Response({"detail": "Missing required route data for insights."}, status=status.HTTP_400_BAD_REQUEST)

        # Construct a detailed prompt for Gemini
        prompt = f"""
        Analyze the following route details for a journey from {start_location} to {end_location} in Harare, Zimbabwe:

        - Distance: {distance}
        - Estimated Duration (with traffic): {duration}
        - Transport Mode: {transport_mode}
        - Current Time: {current_time}

        Additional information:
        - Traffic/Real-time condition: {traffic_info}
        - Current Weather at start: {weather_info}
        - Avoid Highways: {avoid_highways}
        - Avoid Tolls: {avoid_tolls}

        Based on this information and general knowledge about driving/travel in Harare, provide a concise and helpful AI route insight.
        Consider aspects like:
        - Expected journey conditions (e.g., "smooth," "potential delays").
        - Any specific road names or areas known for issues (e.g., "expect congestion near Mbare market").
        - Suggestions for optimal travel times if relevant.
        - How weather might impact the trip (e.g., "rainy conditions may cause slippery roads").
        - Any specific advice for the chosen transport mode (e.g., for 'Kombi', "expect multiple stops and shared ride," for 'Walking', "consider comfortable shoes").
        - General safety tips relevant to the route or time.
        - Mention if the chosen avoidance options (highways/tolls) might significantly affect duration or distance.

        Keep the insight to 2-3 sentences maximum. Be specific to Harare where possible.
        """

        try:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
            insights = response.text.strip()
            return Response({"insights": insights}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            return Response({"detail": f"Failed to generate AI insights: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RouteOptimizationView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'route_optimize'

    def post(self, request):
        serializer = RouteRequestSerializer(data=request.data) # Use RouteRequestSerializer for input validation
        if serializer.is_valid():
            # Extract validated data
            origin = serializer.validated_data['origin']
            destination = serializer.validated_data['destination']
            mode = serializer.validated_data.get('mode', request.user.preferred_transport)
            
            # Get optimized routes
            map_service = GoogleMapsService()
            routes = map_service.get_route(
                origin=origin,
                destination=destination,
                mode=mode,
                avoid=self._get_avoid_params(request.user)
            )
            
            if not routes:
                return Response(
                    {"error": "No routes found for the given criteria."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get AI insights for primary route
            ai_service = GeminiService()
            primary_route = routes[0]
            
            # Prepare route data for AI prompt (convert Point to readable strings)
            ai_route_data = {
                'origin': f"{origin.y},{origin.x}",
                'destination': f"{destination.y},{destination.x}",
                'distance': primary_route.get('distance', 0),
                'duration': primary_route.get('duration', 0)
            }

            ai_insights = ai_service.get_route_insights(
                route=ai_route_data,
                user_prefs={
                    'avoid_tolls': request.user.avoid_tolls,
                    'avoid_highways': request.user.avoid_highways,
                    'preferred_transport': request.user.preferred_transport
                }
            )
            
            # Save route to database using the RouteSerializer for model creation
            route_data_for_db = {
                'user': request.user.id, # Assign user ID
                'origin': origin.hex, # Store Point as WKT or Hex EWKB for PostGIS
                'destination': destination.hex,
                'mode': mode,
                'distance': primary_route.get('distance'),
                'duration': primary_route.get('duration'),
                'polyline': primary_route.get('polyline'),
                'ai_insights': ai_insights # Store AI insights directly
            }
            route_save_serializer = RouteSerializer(data=route_data_for_db)
            if route_save_serializer.is_valid():
                route = route_save_serializer.save(user=request.user) # Pass user instance
            else:
                # Log this error, as it indicates an issue saving to DB after valid API response
                print(f"Error saving route to database: {route_save_serializer.errors}")
                route = None # Or handle more robustly

            return Response({
                'primary_route': primary_route,
                'ai_insights': ai_insights,
                'alternatives': routes[1:],  # Other route options
                'saved_route_id': route.id if route else None
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _get_avoid_params(self, user):
        """Build avoidance parameters based on user preferences"""
        avoid = []
        if user.avoid_tolls:
            avoid.append('tolls')
        if user.avoid_highways:
            avoid.append('highways')
        return avoid if avoid else None

class RouteHistoryView(generics.ListAPIView):
    serializer_class = RouteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['mode', 'created_at'] # Allow filtering by mode and creation date
    ordering_fields = ['created_at', 'distance', 'duration'] # Allow ordering

    def get_queryset(self):
        # Only show routes for the authenticated user
        return Route.objects.filter(user=self.request.user)