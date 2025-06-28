from django.db import models

# Create your models here.
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class CustomUser(AbstractUser):
    username = None
    email = models.EmailField(_('email address'), unique=True)
    
    phone_number = models.CharField(max_length=20, blank=True)
    preferred_transport = models.CharField(
        max_length=20,
        choices=[
            ('DRIVING', 'Driving'),
            ('WALKING', 'Walking'),
            ('BICYCLING', 'Bicycling'),
            ('TRANSIT', 'Public Transport'),
            ('KOMBI', 'Kombi'),
        ],
        default='DRIVING'
    )
    avoid_tolls = models.BooleanField(default=False)
    avoid_highways = models.BooleanField(default=False)
    location_anonymization = models.BooleanField(
        default=True,
        help_text="Anonymize location data for privacy compliance"
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email