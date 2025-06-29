# routing/services.py
import googlemaps
import logging
from django.conf import settings
from django.contrib.gis.geos import Point
from .utils import anonymize_location # Now this import is valid!
import os
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv(override=True)

class GoogleMapsService:
    def __init__(self):
        self.client = googlemaps.Client(key=os.getenv("Maps_API_KEY"))
        if not self.client.key:
            logger.error("Google Maps API Key (Maps_API_KEY) not found in environment for GoogleMapsService.")
            
    def get_route(self, origin: Point, destination: Point, mode='driving', avoid=None):
        """
        Get optimized route from Google Maps API.
        Origin and destination are Point objects.
        """
        try:
            origin_str = self._point_to_str(origin)
            dest_str = self._point_to_str(destination)
            
            params = {
                'origin': origin_str,
                'destination': dest_str,
                'mode': mode,
                'departure_time': 'now', 
                'traffic_model': 'best_guess',
                'alternatives': True
            }
            
            if avoid:
                params['avoid'] = avoid
            
            response = self.client.directions(**params)
            logger.info(f"Google Maps Directions API response status: {response[0].get('status', 'N/A') if response else 'No routes returned'}")
            
            return self._process_routes(response)
        except Exception as e:
            logger.error(f"Google Maps API directions error in get_route: {str(e)}")
            return []
            
    def get_place_details_by_id(self, place_id: str):
        """
        Fetch place details (including coordinates) by Google Place ID.
        Returns a django.contrib.gis.geos.Point object (lng, lat) or None.
        """
        try:
            response = self.client.place(place_id=place_id, fields=['geometry', 'name']) 
            if response and response.get('result') and response['result'].get('geometry'):
                location = response['result']['geometry']['location']
                place_name = response['result'].get('name', place_id)
                logger.info(f"Resolved place ID '{place_id}' to '{place_name}' at {location['lat']},{location['lng']}")
                return Point(location['lng'], location['lat'])
            logger.warning(f"Could not get geometry for place_id: {place_id}. Response: {response}")
            return None
        except Exception as e:
            logger.error(f"Error fetching place details for {place_id}: {str(e)}")
            return None

    def _point_to_str(self, point: Point):
        """Convert Point to 'lat,lng' string for Google Maps API"""
        if settings.ANONYMIZE_LOCATIONS: # Uses the setting defined in core/settings.py
            anonymized = anonymize_location(point)
            return f"{anonymized.y},{anonymized.x}" # Google Maps expects lat,lng
        return f"{point.y},{point.x}"
    
    def _process_routes(self, response):
        """Process Google Maps API response for routes, extracting relevant data."""
        routes = []
        for route in response:
            if not route.get('legs') or not route['legs']:
                logger.warning("Route found without legs in Google Maps response.")
                continue

            leg = route['legs'][0] 
            
            summary = {
                'distance': leg.get('distance', {}).get('text'),  # User-friendly string (e.g., "7.9 km")
                'distance_value': leg.get('distance', {}).get('value', 0),  # Raw value in meters
                'duration': leg.get('duration_in_traffic', {}).get('text', leg.get('duration', {}).get('text')),  # User-friendly string (e.g., "13 mins")
                'duration_value': leg.get('duration_in_traffic', {}).get('value', leg.get('duration', {}).get('value', 0)),  # Raw value in seconds
                'polyline': route.get('overview_polyline', {}).get('points'), # Encoded polyline string
                'steps': [] # Keeping steps for completeness if needed elsewhere
            }
            
            for step in leg.get('steps', []):
                summary['steps'].append({
                    'distance': step.get('distance', {}).get('value'),
                    'duration': step.get('duration', {}).get('value'),
                    'instruction': step.get('html_instructions'),
                    'polyline': step.get('polyline', {}).get('points')
                })
            
            routes.append(summary)
        return routes