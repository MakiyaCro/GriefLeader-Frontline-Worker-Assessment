import re
import logging
from django.http import HttpResponseForbidden
from django.conf import settings

logger = logging.getLogger(__name__)

class SecurityMiddleware:
    """Middleware to block malicious requests and scanning attempts"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Compile regex patterns for faster matching
        self.suspicious_patterns = [
            re.compile(r'\.php$'),              # PHP files
            re.compile(r'/wp-'),                # WordPress scanning (changed from r'wp-' to avoid blocking legitimate paths)
            re.compile(r'/\.env$'),             # Environment file (added leading slash)
            re.compile(r'/eval-stdin'),         # PHP eval attempts
            re.compile(r'/vendor/'),            # Common vendor paths
            re.compile(r'/admin\.php'),         # Admin PHP files
            re.compile(r'\.(git|svn|htaccess)'),# Hidden files
            # Modified to exclude our legitimate upload endpoints
            re.compile(r'/(shell|hack)'),       # Common attack paths (removed 'upload')
            re.compile(r'/[0-9a-f]{32}\.php$'), # MD5 hashed PHP files
        ]
        
        # Known scanning user agents
        self.suspicious_agents = [
            'Go-http-client',  # Seen in your logs
            'zgrab',
            'Nuclei',
            'Nikto',
            'sqlmap',
            'nmap',
            'masscan',
        ]
        
        # Track IP addresses with too many suspicious requests
        self.suspicious_ips = {}
        
        # Threshold for blocking IPs (X suspicious requests in Y seconds)
        self.block_threshold = getattr(settings, 'SECURITY_BLOCK_THRESHOLD', 5)
        
        # Whitelisted paths that should never be considered suspicious
        self.whitelisted_paths = [
            # Base paths
            r'^/$',
            r'^/login/',
            r'^/logout/',
            r'^/dashboard/',
            r'^/static/',
            r'^/media/',
            r'^/admin/',
            r'^/password-reset/',
            r'^/assessment/',
            r'^/thank-you/',
            r'^/create/',
            # API paths
            r'^/api/businesses/\d+/upload-logo/',   # Business logo upload
            r'^/api/businesses/\d+/upload-template/', # Assessment template upload
            r'^/api/businesses/',
            r'^/api/hr-users/',
            r'^/api/managers/',
            r'^/api/question-pairs/',
            r'^/api/attributes/',
            r'^/api/benchmark/',
            r'^/api/admin/',
            # Add any other legitimate paths in your application
        ]
        
        # Compile the whitelist patterns
        self.whitelisted_patterns = [re.compile(pattern) for pattern in self.whitelisted_paths]
        
    def __call__(self, request):
        # Skip middleware in debug mode if configured to do so
        if getattr(settings, 'BYPASS_SECURITY_MIDDLEWARE_IN_DEBUG', False) and settings.DEBUG:
            return self.get_response(request)
        
        # Check if the path is whitelisted
        if self._is_whitelisted_path(request.path):
            return self.get_response(request)
            
        client_ip = self._get_client_ip(request)
        
        # Check if this is a suspicious request
        is_suspicious = self._is_suspicious_request(request)
        
        if is_suspicious:
            # Log suspicious request
            logger.warning(
                f"Blocked suspicious request: {request.method} {request.path} "
                f"from {client_ip} User-Agent: {request.META.get('HTTP_USER_AGENT', 'N/A')}"
            )
            
            # Track suspicious IPs
            self._track_suspicious_ip(client_ip)
            
            # Block the request
            return HttpResponseForbidden("Forbidden")
            
        # IP has too many suspicious requests, block all their requests
        if self._should_block_ip(client_ip):
            logger.warning(f"Blocking all requests from {client_ip} due to suspicious activity")
            return HttpResponseForbidden("Forbidden")
            
        # Proceed with the request
        return self.get_response(request)
    
    def _is_whitelisted_path(self, path):
        """Check if the path is in our whitelist of legitimate paths"""
        for pattern in self.whitelisted_patterns:
            if pattern.match(path):
                return True
        return False
    
    def _get_client_ip(self, request):
        """Get the client IP address accounting for proxies"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            # Get the client's real IP when behind a proxy
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _is_suspicious_request(self, request):
        """Check if this request matches known suspicious patterns"""
        path = request.path.lower()
        
        # Check path against suspicious patterns
        for pattern in self.suspicious_patterns:
            if pattern.search(path):
                return True
        
        # Check user agent against suspicious scanners
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        for agent in self.suspicious_agents:
            if agent.lower() in user_agent:
                return True
                
        return False
    
    def _track_suspicious_ip(self, ip):
        """Track IPs making suspicious requests"""
        from django.utils import timezone
        import datetime
        
        now = timezone.now()
        
        # Initialize tracking for this IP
        if ip not in self.suspicious_ips:
            self.suspicious_ips[ip] = {
                'count': 0,
                'first_seen': now,
                'last_seen': now,
            }
            
        # Update tracking data
        self.suspicious_ips[ip]['count'] += 1
        self.suspicious_ips[ip]['last_seen'] = now
        
        # Clean up old entries (more than 1 hour old)
        for tracked_ip in list(self.suspicious_ips.keys()):
            if now - self.suspicious_ips[tracked_ip]['last_seen'] > datetime.timedelta(hours=1):
                del self.suspicious_ips[tracked_ip]
    
    def _should_block_ip(self, ip):
        """Determine if an IP should be blocked based on suspicious activity"""
        if ip not in self.suspicious_ips:
            return False
            
        # Block if they've made too many suspicious requests
        return self.suspicious_ips[ip]['count'] >= self.block_threshold

class SecurityHeadersMiddleware:
    """Add security headers to all responses"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add security headers
        
        # Content-Security-Policy: Controls what resources the browser is allowed to load
        response['Content-Security-Policy'] = "default-src 'self'; " \
                                             "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://code.jquery.com; " \
                                             "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " \
                                             "img-src 'self' data:; " \
                                             "font-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " \
                                             "frame-ancestors 'self'; " \
                                             "form-action 'self'"
        
        # X-Content-Type-Options: Prevents browsers from MIME-sniffing a response away from the declared content-type
        response['X-Content-Type-Options'] = 'nosniff'
        
        # X-Frame-Options: Prevents clickjacking by denying framing of your site
        response['X-Frame-Options'] = 'SAMEORIGIN'
        
        # Referrer-Policy: Controls how much referrer information is sent
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions-Policy: Controls which browser features and APIs can be used
        response['Permissions-Policy'] = 'geolocation=(), camera=(), microphone=()'
        
        # Strict-Transport-Security: Ensures HTTPS usage
        if not request.is_secure() and not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            
        return response