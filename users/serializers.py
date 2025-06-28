
# users/serializers.py
# Make sure to import everything needed, especially from allauth.account
from rest_framework import serializers
from .models import CustomUser, TRANSPORT_MODES 
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from allauth.account.adapter import get_adapter
from allauth.account import app_settings as allauth_account_settings # To read allauth settings
from allauth.account.utils import setup_user_email


class FullyCustomRegisterSerializer(serializers.Serializer):
    """
    A custom serializer to handle user registration without relying on
    dj_rest_auth's RegisterSerializer which has stubborn username requirements.
    It directly interacts with django-allauth's adapter.
    """
    email = serializers.EmailField(
        required=True,
        allow_blank=False,
        max_length=CustomUser._meta.get_field('email').max_length,
    )
    password = serializers.CharField(
        style={'input_type': 'password'},
        write_only=True,
        min_length=allauth_account_settings.PASSWORD_MIN_LENGTH,
    )
    password2 = serializers.CharField(
        style={'input_type': 'password'},
        write_only=True,
        min_length=allauth_account_settings.PASSWORD_MIN_LENGTH,
    )

    phone_number = serializers.CharField(max_length=20, required=True)
    preferred_transport = serializers.ChoiceField(choices=TRANSPORT_MODES, required=True)
    avoid_tolls = serializers.BooleanField(required=False, default=False)
    avoid_highways = serializers.BooleanField(required=False, default=False)
    location_anonymization = serializers.BooleanField(required=False, default=False)

    def validate_email(self, email):
        email = get_adapter().clean_email(email)
        if CustomUser.objects.filter(email=email).exists():
            raise serializers.ValidationError(_("A user is already registered with this e-mail address."))
        return email

    def validate(self, data):
        password = data.get('password')
        password2 = data.get('password2')

        if password and password2 and password != password2:
            raise serializers.ValidationError({"password2": _("Passwords do not match.")})

        if not password:
            raise serializers.ValidationError({"password": _("Password is required.")})
        data.pop('password2', None)

        return data

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data.pop('email')
        password = validated_data.pop('password')

        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            **validated_data 
        )

        request = self.context.get('request')
        if request:
            setup_user_email(request, user, [])

        return user
class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class UserDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = (
            'id', 'email', 'first_name', 'last_name', 'phone_number',
            'preferred_transport', 'avoid_tolls', 'avoid_highways', 'location_anonymization'
        )
        read_only_fields = ('email',) # Email should not be changeable after registration

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.phone_number = validated_data.get('phone_number', instance.phone_number)
        instance.preferred_transport = validated_data.get('preferred_transport', instance.preferred_transport)
        instance.avoid_tolls = validated_data.get('avoid_tolls', instance.avoid_tolls)
        instance.avoid_highways = validated_data.get('avoid_highways', instance.avoid_highways)
        instance.location_anonymization = validated_data.get('location_anonymization', instance.location_anonymization)
        instance.save()
        return instance