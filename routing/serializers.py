from rest_framework import serializers
from .models import Route
from django.contrib.gis.geos import Point

class PointField(serializers.Field):
    """
    Custom serializer field for handling GeoDjango Point objects.
    Expects and returns a string in "lat,lng" format.
    """
    def to_representation(self, obj):
        if obj:
            return f"{obj.y},{obj.x}" # Return as "lat,lng"
        return None

    def to_internal_value(self, data):
        if not isinstance(data, str):
            raise serializers.ValidationError("Expected a string in 'lat,lng' format.")
        try:
            lat_str, lng_str = data.split(',')
            lat = float(lat_str)
            lng = float(lng_str)
            return Point(lng, lat, srid=4326) # Store as Point(lon, lat) with SRID 4326 (WGS84)
        except (ValueError, AttributeError):
            raise serializers.ValidationError("Invalid format for point. Expected 'lat,lng'.")


class RouteRequestSerializer(serializers.Serializer):
    # This serializer is used for validating incoming request data for route optimization
    origin = PointField(help_text="Origin in 'latitude,longitude' format (e.g., '-17.8248,31.0530')")
    destination = PointField(help_text="Destination in 'latitude,longitude' format (e.g., '-17.8248,31.0530')")
    mode = serializers.CharField(
        max_length=20,
        required=False,
        help_text="Transport mode: DRIVING, WALKING, BICYCLING, TRANSIT, KOMBI"
    )

class RouteSerializer(serializers.ModelSerializer):
    # This serializer is used for representing the Route model instances
    origin = PointField(read_only=True)
    destination = PointField(read_only=True)
    
    class Meta:
        model = Route
        fields = '__all__'
        read_only_fields = ('user', 'distance', 'duration', 'polyline', 'ai_insights', 'created_at')