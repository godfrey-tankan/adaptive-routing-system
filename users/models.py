# users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from .managers import CustomUserManager # Import your custom manager

# Define transport mode choices
TRANSPORT_MODES = [
    ('DRIVING', _('Private Car')),
    ('KOMBI', _('Kombi')),
    ('WALKING', _('Walking')),
    ('BICYCLE', _('Bicycle')),
    ('MIXED', _('Mixed Transport')),
]

class CustomUser(AbstractUser):
    username = None

    email = models.EmailField(_('email address'), unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True, unique=True)
    preferred_transport = models.CharField(
        max_length=10,
        choices=TRANSPORT_MODES,
        default='DRIVING',
    )
    first_name = models.CharField(_("first name"), max_length=150, blank=True)
    last_name = models.CharField(_("last name"), max_length=150, blank=True)

    avoid_tolls = models.BooleanField(default=False)
    avoid_highways = models.BooleanField(default=False)
    location_anonymization = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['phone_number'] 

    objects = CustomUserManager()

    def __str__(self):
        return self.email