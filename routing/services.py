import googlemaps
import logging
from django.conf import settings
from django.contrib.gis.geos import Point
from .utils import anonymize_location # Now this import is valid!

logger = logging.getLogger(__name__)

class GoogleMapsService:
    def __init__(self):
        self.client = googlemaps.Client(key=settings.Maps_API_KEY)
    
    def get_route(self, origin: Point, destination: Point, mode='driving', avoid=None):
        """Get optimized route from Google Maps API"""
        try:
            # Apply Zimbabwe-specific anonymization if needed
            origin_str = self._point_to_str(origin)
            dest_str = self._point_to_str(destination)
            
            # Build request parameters
            params = {
                'origin': origin_str,
                'destination': dest_str,
                'mode': mode,
                'departure_time': 'now', # Consider using a specific datetime for more accurate predictions
                'traffic_model': 'best_guess',
                'alternatives': True
            }
            
            # Add avoidance parameters
            if avoid:
                params['avoid'] = avoid
            
            # Make API request
            response = self.client.directions(**params)
            
            # Process and return routes
            return self._process_routes(response)
        except Exception as e:
            logger.error(f"Google Maps API error: {str(e)}")
            return []
    
    def _point_to_str(self, point: Point):
        """Convert Point to 'lat,lng' string with anonymization"""
        if settings.ANONYMIZE_LOCATIONS: # Uses the setting defined in core/settings.py
            anonymized = anonymize_location(point)
            return f"{anonymized.y},{anonymized.x}" # Google Maps expects lat,lng
        return f"{point.y},{point.x}"
    
    def _process_routes(self, response):
        """Process Google Maps API response"""
        routes = []
        for route in response:
            # Check if legs exist and are not empty
            if not route.get('legs') or not route['legs']:
                continue

            # Choose the first leg for simplicity, as most routes have one leg for A-B
            leg = route['legs'][0] 
            
            summary = {
                'distance': leg.get('distance', {}).get('value'),  # meters
                'duration': leg.get('duration_in_traffic', {}).get('value', leg.get('duration', {}).get('value')),  # seconds
                'polyline': route.get('overview_polyline', {}).get('points'),
                'steps': []
            }
            
            # Process each step
            for step in leg.get('steps', []):
                summary['steps'].append({
                    'distance': step.get('distance', {}).get('value'),
                    'duration': step.get('duration', {}).get('value'),
                    'instruction': step.get('html_instructions'),
                    'polyline': step.get('polyline', {}).get('points')
                })
            
            routes.append(summary)
        return routes