from django.urls import path, include
from rest_framework_simplejwt.views import TokenVerifyView
from .views import RegisterUserView, CustomTokenObtainPairView, CustomTokenRefreshView, LogoutView, ManageUserView

urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', ManageUserView.as_view(), name='user_details'),
    path('', include('dj_rest_auth.urls')),
    path('registration/', include('dj_rest_auth.registration.urls')),
]