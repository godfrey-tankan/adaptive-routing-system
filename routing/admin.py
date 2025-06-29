from django.contrib import admin
from .models import Route
# Register your models here.

@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('user', 'origin', 'destination', 'mode', 'distance', 'duration', 'created_at')
    search_fields = ('user__email', 'origin', 'destination')
    list_filter = ('mode', 'created_at')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user')