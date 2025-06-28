from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.http import JsonResponse
import ipaddress
import logging

logger = logging.getLogger(__name__)

class ZimbabweSecurityMiddleware(MiddlewareMixin):
    """Custom security middleware for Zimbabwe compliance and enhanced security."""
    ZIMBABWE_IP_RANGES = [
        ipaddress.ip_network('154.72.0.0/16'),  
        ipaddress.ip_network('197.211.0.0/16'), 
        ipaddress.ip_network('105.112.0.0/12'), 
    ]

    def process_request(self, request):
        request.META['HTTP_STRICT_TRANSPORT_SECURITY'] = 'max-age=31536000; includeSubDomains'
        request.META['HTTP_X_CONTENT_TYPE_OPTIONS'] = 'nosniff'
        request.META['HTTP_X_FRAME_OPTIONS'] = 'DENY'
        
        ip = self.get_client_ip(request)
        
        is_zim_ip = False
        try:
            client_ip_obj = ipaddress.ip_address(ip)
            for ip_range in self.ZIMBABWE_IP_RANGES:
                if client_ip_obj in ip_range:
                    is_zim_ip = True
                    break
        except ValueError:
            logger.warning(f"Invalid IP address format received: {ip}")

        if is_zim_ip:
            key = f"rate_limit_zim:{ip}"
            count = cache.get_or_set(key, 0, 60)  # 1-minute window
            if count >= 50: # Stricter limit for Zim IPs
                logger.warning(f"Rate limit exceeded for Zimbabwean IP: {ip}")
                return JsonResponse(
                    {"error": "Rate limit exceeded for this region. Please try again later."},
                    status=429
                )
            cache.incr(key)
            logger.debug(f"Zimbabwean IP {ip} rate limit count: {count + 1}")
        else:
            key = f"rate_limit_global:{ip}"
            count = cache.get_or_set(key, 0, 60) # 1-minute window
            if count >= 100: # General limit for non-Zim IPs
                logger.warning(f"Rate limit exceeded for global IP: {ip}")
                return JsonResponse(
                    {"error": "Too many requests. Please try again later."},
                    status=429
                )
            cache.incr(key)
            logger.debug(f"Global IP {ip} rate limit count: {count + 1}")
        
        return None # Continue to the next middleware or view
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip