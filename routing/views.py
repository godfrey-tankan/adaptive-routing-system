# routing/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.gis.geos import Point
from .models import Route
from .serializers import RouteSerializer, RouteRequestSerializer
from .services import GoogleMapsService
# from ai_services.services import GeminiService # If you have a separate service for AI, use that
from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
import os
import google.generativeai as genai
import requests
from django.conf import settings
from dotenv import load_dotenv
import logging
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from datetime import datetime 
from rest_framework.generics import RetrieveDestroyAPIView 

logger = logging.getLogger(__name__)

load_dotenv(override=True)

# Configure Gemini API globally
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
if not os.getenv("GEMINI_API_KEY"):
    logger.warning("GEMINI_API_KEY environment variable is not set. AI insights may fail.")

def _get_ai_insights_for_route(start_location_name, end_location_name, transport_mode, distance_value: float, duration_value: float):
    """
    Get AI insights using Gemini.
    This function expects distance_value in meters (float/int) and duration_value in seconds (float/int).
    """
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')

        distance_km = f"{(distance_value / 1000):.1f} km" if isinstance(distance_value, (int, float)) and distance_value is not None else "unknown distance"
        duration_mins = f"{round(duration_value / 60)} minutes" if isinstance(duration_value, (int, float)) and duration_value is not None else "unknown duration"

        prompt = f"""
        You are a Zimbabwean transportation expert providing route insights for travel within Zimbabwe, 
        particularly focusing on Harare and surrounding areas. Analyze this route from {start_location_name} to {end_location_name}:

        Route Details:
        - Distance: {distance_km}
        - Duration: {duration_mins}
        - Transport: {'Kombi' if transport_mode.lower() == 'transit' else transport_mode}
        - Time: {datetime.now().strftime("%Y-%m-%d %I:%M %p")}
        - Weather: (weather data is not currently available for real-time simulation)
        - Options: (no specific avoidances provided for simulation)

            Give super concise, friendly, hyper-localized advice (max 3 sentences, skip any introduction):
            1. For kombi: Mention known ranks, typical fares (USD $1 Harare, $2-3 nearby towns), and peak hours to avoid (7-8am, 4-6pm).
            2. For driving: Note problem spots (e.g., Samora Machel Ave rush hour), parking in CBD.
            3. Walking: Highlight unsafe areas, especially after dark.
            4. Weather: Mention if rain/flooding affects route.
            5. Time-specific: E.g., "Avoid CBD 4-6pm due to kombi congestion."
            6. Suggest alternatives if relevant.
            7. Safety: E.g., "Keep valuables hidden at Mbare Musika."
            Use local terms like "kombi" not "bus", "CBD" not "downtown". Go straight to the point.
        """
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API error in AI insights generation: {str(e)}", exc_info=True) # Added exc_info
        return "Could not generate AI insights for this route at the moment."

class RouteOptimizationView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'route_optimize'
    
    def post(self, request):
        serializer = RouteRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            logger.info("Route optimization request received")
            
            origin_lat, origin_lng = map(float, serializer.validated_data['origin'].split(','))
            destination_lat, destination_lng = map(float, serializer.validated_data['destination'].split(','))
            
            origin_point = Point(origin_lng, origin_lat)
            destination_point = Point(destination_lng, destination_lat)
            
            logger.info(f"Origin: {origin_point}, Destination: {destination_point}")
            
            mode = serializer.validated_data.get('mode', 'driving')
            logger.info(f"Transport mode: {mode}")
            
            map_service = GoogleMapsService()
            routes = map_service.get_route(
                origin=origin_point,
                destination=destination_point,
                mode=mode,
                avoid=self._get_avoid_params(request)
            )
            logger.info(f"Found {len(routes)} routes")
            
            if not routes:
                return Response(
                    {"error": "No routes found for the given criteria."},
                    status=status.HTTP_404_NOT_FOUND
                )
            logger.info("Routes successfully retrieved")
            
            primary_route = routes[0]
            
            ai_insights = _get_ai_insights_for_route(
                start_location_name=request.data.get('origin_name', f"{origin_point.y},{origin_point.x}"),
                end_location_name=request.data.get('destination_name', f"{destination_point.y},{destination_point.x}"),
                transport_mode=mode,
                distance_value=primary_route.get('distance_value', 0), 
                duration_value=primary_route.get('duration_value', 0)
            )
            
            route_data = {
                'origin': origin_point,
                'destination': destination_point,
                'mode': mode, 
                'distance': primary_route.get('distance_value', 0),
                'duration': primary_route.get('duration_value', 0),
                'polyline': primary_route.get('polyline'), 
                'ai_insights': ai_insights
            }
            
            route = Route.objects.create(
                user=request.user,
                **route_data
            )
            logger.info(f"Route saved with ID: {route.id}")
            
            return Response({
                'primary_route': primary_route,
                'ai_insights': ai_insights,
                'alternatives': routes[1:],
                'saved_route_id': route.id 
            }, status=status.HTTP_200_OK)
            
            
        except Exception as e:
            logger.error(f"Route optimization error: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred during route optimization", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_avoid_params(self, request):
        avoid = []
        if request.data.get('avoid_highways'):
            avoid.append('highways')
        if request.data.get('avoid_tolls'):
            avoid.append('tolls')
        return avoid if avoid else None

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
        current_time = data.get('current_time', 'now')

        # Updated check for meaningful data for AI Insights
        if not all([start_location, end_location]) or (distance == "0.0 km" and duration == "0 mins"):
            logger.warning("Missing or invalid route data for insights, skipping Gemini call.")
            return Response({"insights": "Cannot provide insights due to missing or invalid route data."}, status=status.HTTP_200_OK)

        logger.info(f"Generating insights for route from {start_location} to {end_location} using {transport_mode}")
        logger.info(f"Distance: {distance}, Duration: {duration}, Traffic: {traffic_info}, Time: {current_time}")
        parsed_distance_value = 0.0
        if isinstance(distance, str) and 'km' in distance:
            try:
                parsed_distance_value = float(distance.replace(' km', '')) * 1000 # Convert km to meters
            except ValueError:
                logger.warning(f"Could not parse distance string to float: {distance}")
        elif isinstance(distance, (int, float)):
             parsed_distance_value = float(distance)


        parsed_duration_value = 0.0
        if isinstance(duration, str) and 'mins' in duration:
            try:
                parsed_duration_value = float(duration.replace(' mins', '')) * 60 # Convert minutes to seconds
            except ValueError:
                logger.warning(f"Could not parse duration string to float: {duration}")
        elif isinstance(duration, (int, float)):
            parsed_duration_value = float(duration)
        
        insights = _get_ai_insights_for_route(
            start_location_name=start_location,
            end_location_name=end_location,
            transport_mode=transport_mode,
            distance_value=parsed_distance_value, # Pass as numerical value
            duration_value=parsed_duration_value # Pass as numerical value
        )
        logger.info(f"Insights Generated Successfully, sending response...")
        return Response({"insights": insights}, status=status.HTTP_200_OK)
        
class RouteHistoryView(generics.ListAPIView):
    serializer_class = RouteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['mode', 'created_at']
    ordering_fields = ['created_at', 'distance', 'duration']

    def get_queryset(self):
        return Route.objects.filter(user=self.request.user)

class RouteDetailView(RetrieveDestroyAPIView): # New view for Retrieve and Delete
    queryset = Route.objects.all()
    serializer_class = RouteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure users can only retrieve/delete their own routes
        return self.queryset.filter(user=self.request.user)

class WeatherView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        lat = request.data.get('lat')
        lon = request.data.get('lon')
        logger.info(f"Weather request received for lat: {lat}, lon: {lon}")
        if not all([lat, lon]):
            return Response(
                {"error": "Latitude and longitude are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            openweathermap_api_key = os.getenv('OPENWEATHER_API_KEY')
            if not openweathermap_api_key:
                logger.error("OPENWEATHER_API_KEY environment variable is not set for WeatherView.")
                return Response({"error": "Server configuration error: Weather API key not found."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            response = requests.get(
                f"https://api.openweathermap.org/data/2.5/weather",
                params={
                    'lat': lat,
                    'lon': lon,
                    'appid': openweathermap_api_key,
                    'units': 'metric'
                }
            )
            logger.info(f"Weather Status Updated...")
            response.raise_for_status()
            return Response(response.json(), status=status.HTTP_200_OK)
        except requests.RequestException as e:
            logger.error(f"Error fetching weather data: {e}", exc_info=True)
            return Response(
                {"error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY
            )

@csrf_exempt
def simulate_route(request):
    if request.method == 'POST':
        logger.info("Simulate route request received")
        try:
            data = json.loads(request.body)
            start_place_id = data.get('startPlaceId')
            end_place_id = data.get('endPlaceId')
            mode = data.get('mode')
            start_location_name = data.get('start_location_name') # Get location name from frontend
            end_location_name = data.get('end_location_name')     # Get location name from frontend

            logger.info(f"Start Place ID: {start_place_id}, End Place ID: {end_place_id}, Mode: {mode}, Start Name: {start_location_name}, End Name: {end_location_name}")

            if not all([start_place_id, end_place_id, mode, start_location_name, end_location_name]):
                logger.error("Missing required parameters for simulation.")
                return JsonResponse({
                    'error': 'Missing required parameters (place IDs, names, or mode).',
                    'status': 'error'
                }, status=status.HTTP_400_BAD_REQUEST)

            map_service = GoogleMapsService()
            
            origin_point = map_service.get_place_details_by_id(start_place_id)
            destination_point = map_service.get_place_details_by_id(end_place_id)

            if not origin_point or not destination_point:
                logger.warning(f"Could not resolve coordinates for one or both place IDs: Start='{start_place_id}', End='{end_place_id}'")
                return JsonResponse({
                    'error': 'Could not resolve exact coordinates for the provided locations. Please try more specific locations.',
                    'status': 'error'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get route using GoogleMapsService
            routes_from_service = map_service.get_route(
                origin=origin_point,
                destination=destination_point,
                mode=mode.lower() # Ensure mode is lowercase for consistency
            )
            
            if routes_from_service:
                primary_route_data = routes_from_service[0]
                
                # Log actual distance and duration values
                logger.info(f"Simulation Route Created Successfully. Distance: {primary_route_data.get('distance')}, Duration: {primary_route_data.get('duration')}")
                # Generate AI insights
                ai_insights = _get_ai_insights_for_route(
                    start_location_name=start_location_name,
                    end_location_name=end_location_name,
                    transport_mode=mode,
                    distance_value=primary_route_data.get('distance_value', 0), 
                    duration_value=primary_route_data.get('duration_value', 0)
                )

                return JsonResponse({
                    'route': {
                        'overview_polyline': {'points': primary_route_data.get('polyline')},
                        'distance': {'value': primary_route_data.get('distance_value', 0)},
                        'duration': {'value': primary_route_data.get('duration_value', 0)},
                    },
                    'ai_insights': ai_insights,
                    'status': 'success'
                }, status=status.HTTP_200_OK)
            else:
                logger.warning(f"No routes found from Google Maps Service for simulation between '{start_location_name}' and '{end_location_name}'.")
                return JsonResponse({
                    'error': 'No route found for the given locations. This might be due to invalid inputs or geographical constraints.',
                    'status': 'error'
                }, status=status.HTTP_404_NOT_FOUND)
        
        except json.JSONDecodeError:
            logger.error("Invalid JSON in request body for simulate_route.", exc_info=True)
            return JsonResponse({
                'error': 'Invalid request body format.',
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unhandled error in simulate_route: {e}", exc_info=True)
            return JsonResponse({
                'error': f'An unexpected server error occurred: {e}',
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return JsonResponse({
        'error': 'Method not allowed',
        'status': 'error'
    }, status=status.HTTP_405_METHOD_NOT_ALLOWED)
