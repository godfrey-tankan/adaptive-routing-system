from django.shortcuts import render

# Create your views here.
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from .serializers import FullyCustomRegisterSerializer, UserDetailsSerializer, UserLoginSerializer
from rest_framework.views import APIView
from django.contrib.auth import authenticate, logout
from rest_framework_simplejwt.tokens import RefreshToken

CustomUser = get_user_model()

class RegisterUserView(APIView):
    permission_classes = [permissions.AllowAny]
    """
    Handles user registration using FullyCustomRegisterSerializer.
    """
    def post(self, request, *args, **kwargs):
        print("RegisterUserView called with data:", request.data)
        serializer = FullyCustomRegisterSerializer(data=request.data, context={'request': request})
        
        serializer.is_valid(raise_exception=True)
        
        user = serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)
class CustomTokenObtainPairView(TokenObtainPairView):
    pass

class CustomTokenRefreshView(TokenRefreshView):
    pass

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh_token"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            logout(request)
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ManageUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDetailsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user