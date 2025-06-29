from rest_framework import serializers
from .models import Route
from django.contrib.gis.geos import Point
class PointField(serializers.Field):
    """Custom field for handling Point objects"""
    def to_representation(self, value):
        if value:
            return f"{value.y},{value.x}"  # lat,lng
        return None

    def to_internal_value(self, data):
        try:
            lat, lng = map(float, data.split(','))
            return Point(lng, lat)  # Note: Point takes (x,y) which is (lng,lat)
        except (ValueError, AttributeError):
            raise serializers.ValidationError("Invalid format. Expected 'lat,lng'")

class RouteRequestSerializer(serializers.Serializer):
    origin = serializers.CharField()
    destination = serializers.CharField()
    mode = serializers.CharField(required=False, default='driving')
    avoid_highways = serializers.BooleanField(required=False, default=False)
    avoid_tolls = serializers.BooleanField(required=False, default=False)

    def validate_origin(self, value):
        try:
            lat, lng = map(float, value.split(','))
            return value
        except ValueError:
            raise serializers.ValidationError("Invalid origin format. Expected 'lat,lng'")

    def validate_destination(self, value):
        try:
            lat, lng = map(float, value.split(','))
            return value
        except ValueError:
            raise serializers.ValidationError("Invalid destination format. Expected 'lat,lng'")

class RouteSerializer(serializers.ModelSerializer):
    origin = PointField()
    destination = PointField()
    
    class Meta:
        model = Route
        fields = '__all__'
        read_only_fields = ('user', 'created_at')