from django.urls import path
from .views import RouteOptimizationView, RouteHistoryView

urlpatterns = [
    path('optimize/', RouteOptimizationView.as_view(), name='route_optimize'),
    path('history/', RouteHistoryView.as_view(), name='route_history'),
]