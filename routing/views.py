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
import requests
from django.conf import settings
from dotenv import load_dotenv
import logging
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

logger = logging.getLogger(__name__)

load_dotenv(override=True) # Load environment variables from .env

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# routing/views.py

class RouteOptimizationView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'route_optimize'

    def post(self, request):
        serializer = RouteRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Convert string coordinates to Point objects
            origin_coords = serializer.validated_data['origin'].split(',')
            destination_coords = serializer.validated_data['destination'].split(',')
            
            origin = Point(float(origin_coords[1]), float(origin_coords[0]))  # Note: Point takes (x,y) which is (lng,lat)
            destination = Point(float(destination_coords[1]), float(destination_coords[0]))
            
            # Get transport mode with fallback
            mode = serializer.validated_data.get('mode', 'driving')
            
            # Get optimized routes
            map_service = GoogleMapsService()
            routes = map_service.get_route(
                origin=origin,
                destination=destination,
                mode=mode,
                avoid=self._get_avoid_params(request)
            )
            
            if not routes:
                return Response(
                    {"error": "No routes found for the given criteria."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get AI insights for primary route
            primary_route = routes[0]
            ai_insights = self._get_ai_insights(request, primary_route, origin, destination)
            
            # Prepare route data for saving
            route_data = {
                'origin': origin,
                'destination': destination,
                'mode': mode,
                'distance': primary_route.get('distance'),
                'duration': primary_route.get('duration'),
                'polyline': primary_route.get('polyline'),
                'ai_insights': ai_insights
            }
            
            # Save route to database
            route = Route.objects.create(
                user=request.user,
                **route_data
            )
            
            return Response({
                'primary_route': primary_route,
                'ai_insights': ai_insights,
                'alternatives': routes[1:],
                'saved_route_id': route.id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Route optimization error: {str(e)}")
            return Response(
                {"error": "An error occurred during route optimization"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_avoid_params(self, request):
        """Build avoidance parameters based on request data"""
        avoid = []
        if request.data.get('avoid_highways'):
            avoid.append('highways')
        if request.data.get('avoid_tolls'):
            avoid.append('tolls')
        return avoid if avoid else None
    
    def _get_ai_insights(self, request, route, origin, destination):
        """Get AI insights using Gemini"""
        try:
            prompt = f"""
            Analyze this route from {origin.y},{origin.x} to {destination.y},{destination.x}:
            - Distance: {route.get('distance')} meters
            - Duration: {route.get('duration')} seconds
            - Mode: {request.data.get('mode', 'driving')}
            
            Provide concise travel advice considering:
            - Typical traffic patterns
            - Road conditions
            - Weather considerations
            - Safety tips
            """
            
            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            return None


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

        # Zimbabwe-specific prompt
        prompt = f"""
        You are a Zimbabwean transportation expert providing route insights for travel within Zimbabwe, 
        particularly focusing on Harare and surrounding areas. Analyze this route from {start_location} to {end_location}:

        Route Details:
        - Distance: {distance}
        - Duration: {duration}
        - Transport: {'Kombi' if transport_mode == 'transit' else transport_mode}
        - Time: {current_time}
        - Weather: {weather_info}
        - Options: {'No highways' if avoid_highways else 'May use highways'}, {'No tolls' if avoid_tolls else 'May use tolls'}

        Provide specific, localized advice considering:
        1. For Kombi routes: Mention known ranks, expected fares (USD $1 for Harare, $2-3 for nearby towns), 
        and peak hours to avoid (7-8am, 4-6pm). Example: "Use Copacabana rank for Mbare routes."
        
        2. For driving: Note problem areas like Samora Machel Ave during rush hour, or parking challenges in CBD.
        
        3. Walking: Highlight unsafe areas to avoid, especially after dark.
        
        4. Weather impacts: Like flooded roads in high-density suburbs during rains.
        
        5. Time-specific advice: "Avoid CBD between 4-6pm due to kombi congestion."
        
        6. Alternative routes if relevant: "Consider Seke Road instead of Simon Mazorodze if going to Chitungwiza."
        
        7. Safety: "Keep valuables hidden at Mbare Musika bus rank."
        
        Keep response concise and summarized (1-3 sentences) and hyper-localized to Zimbabwean context.
        Use local terms like "kombi" not "bus", "CBD" not "downtown".
        """

        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content(prompt)
            insights = response.text.strip()
            return Response({"insights": insights}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            return Response({"detail": f"Failed to generate AI insights: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RouteHistoryView(generics.ListAPIView):
    serializer_class = RouteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['mode', 'created_at'] # Allow filtering by mode and creation date
    ordering_fields = ['created_at', 'distance', 'duration'] # Allow ordering

    def get_queryset(self):
        # Only show routes for the authenticated user
        return Route.objects.filter(user=self.request.user)


class WeatherView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        lat = request.data.get('lat')
        lon = request.data.get('lon')
        
        if not all([lat, lon]):
            return Response(
                {"error": "Latitude and longitude are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            response = requests.get(
                f"https://api.openweathermap.org/data/2.5/weather",
                params={
                    'lat': lat,
                    'lon': lon,
                    'appid': settings.OPENWEATHER_API_KEY,
                    'units': 'metric'
                }
            )
            response.raise_for_status()
            return Response(response.json(), status=status.HTTP_200_OK)
        except requests.RequestException as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY
            )

@csrf_exempt
def simulate_route(request):
    if request.method == 'POST':
        
        try:
            data = json.loads(request.body)
            start_place_id = data.get('startPlaceId')
            end_place_id = data.get('endPlaceId')
            mode = data.get('mode')
            
            # Call Google Maps API from server
            url = f"https://maps.googleapis.com/maps/api/directions/json"
            params = {
                'origin': f"place_id:{start_place_id}",
                'destination': f"place_id:{end_place_id}",
                'mode': mode.lower(),
                'departure_time': 'now',
                'traffic_model': 'best_guess',
                'key': os.getenv('Maps_API_KEY')
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            if data.get('routes'):
                return JsonResponse({
                    'route': data['routes'][0],
                    'status': 'success'
                })
            return JsonResponse({
                'error': 'No route found',
                'status': 'error'
            }, status=404)
            
        except Exception as e:
            return JsonResponse({
                'error': str(e),
                'status': 'error'
            }, status=500)
    
    return JsonResponse({
        'error': 'Method not allowed',
        'status': 'error'
    }, status=405)