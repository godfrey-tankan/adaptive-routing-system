from django.db import models

# Create your models here.
from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point
from django.conf import settings # To link to CustomUser

class Route(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='routes')
    origin = gis_models.PointField()
    destination = gis_models.PointField()
    mode = models.CharField(max_length=20, default='DRIVING') # e.g., DRIVING, WALKING, KOMBI
    distance = models.IntegerField(null=True, blank=True, help_text="Distance in meters")
    duration = models.IntegerField(null=True, blank=True, help_text="Duration in seconds")
    polyline = models.TextField(null=True, blank=True, help_text="Encoded polyline of the route")
    ai_insights = models.JSONField(null=True, blank=True) # To store AI-generated insights
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Route from {self.origin.y},{self.origin.x} to {self.destination.y},{self.destination.x} by {self.user.email}"

    class Meta:
        ordering = ['-created_at']