from rest_framework import serializers
from .models import CustomUser

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = CustomUser
        fields = ('email', 'password', 'password2', 'phone_number', 'preferred_transport', 'avoid_tolls', 'avoid_highways', 'location_anonymization')
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop('password2') # Remove password2 before creating user
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            phone_number=validated_data.get('phone_number', ''),
            preferred_transport=validated_data.get('preferred_transport', 'DRIVING'),
            avoid_tolls=validated_data.get('avoid_tolls', False),
            avoid_highways=validated_data.get('avoid_highways', False),
            location_anonymization=validated_data.get('location_anonymization', True)
        )
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