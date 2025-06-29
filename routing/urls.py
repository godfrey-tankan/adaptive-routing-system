from django.urls import path
from .views import RouteOptimizationView, RouteHistoryView, GeminiInsightsView, WeatherView, simulate_route

urlpatterns = [
    path('optimize/', RouteOptimizationView.as_view(), name='route_optimize'),
    path('history/', RouteHistoryView.as_view(), name='route_history'),
    path('gemini-insights/', GeminiInsightsView.as_view(), name='gemini-insights'),
    path('weather/', WeatherView.as_view(), name='weather'),
    path('simulate/', simulate_route, name='simulate_route'),
]