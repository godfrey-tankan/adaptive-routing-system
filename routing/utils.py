from django.contrib.gis.geos import Point
import random

def anonymize_location(point: Point, degree_offset: float = 0.001) -> Point:
    """
    Anonymizes a geographic point by adding a small, random offset.
    degree_offset: Maximum degree offset for latitude and longitude.
    """
    if not isinstance(point, Point):
        raise TypeError("Input must be a django.contrib.gis.geos.Point object.")

    lat_offset = random.uniform(-degree_offset, degree_offset)
    lon_offset = random.uniform(-degree_offset, degree_offset)

    anonymized_lat = point.y + lat_offset
    anonymized_lon = point.x + lon_offset
    return Point(anonymized_lon, anonymized_lat, srid=point.srid)