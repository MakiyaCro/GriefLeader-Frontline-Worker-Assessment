from functools import wraps
from django.core.cache import cache
from django.http import HttpResponse
from django.utils import timezone
import time

def rate_limit(key_prefix, limit=5, period=60):
    """
    Rate limiting decorator for Django views.
    
    Args:
        key_prefix: Prefix for the cache key (e.g., 'login', 'reset_password')
        limit: Maximum number of requests allowed in the time period
        period: Time period in seconds
        
    Example usage:
        @rate_limit('login', limit=5, period=60)
        def login_view(request):
            # Your login view code
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            # Get client IP
            ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
            
            # Create a unique cache key using prefix and client IP
            cache_key = f"{key_prefix}_{ip}"
            
            # Get current requests info from cache
            requests = cache.get(cache_key, [])
            
            # Get current timestamp
            now = time.time()
            
            # Filter out requests older than the period
            requests = [r for r in requests if r > now - period]
            
            # Check if request limit is reached
            if len(requests) >= limit:
                # Return a 429 Too Many Requests response
                response = HttpResponse(
                    "Rate limit exceeded. Please try again later.", 
                    status=429
                )
                # Add Retry-After header to indicate when the client can try again
                response['Retry-After'] = int(period - (now - requests[0]))
                return response
                
            # Add current request timestamp to the list
            requests.append(now)
            
            # Update cache
            cache.set(cache_key, requests, timeout=period)
            
            # Process the view
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator