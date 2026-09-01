"""
URL configuration for FrontLWAA project.

The `urlpatterns` list routes URLs to views.
For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views

urlpatterns = [
    # Regular application URLs
    path('', include('baseapp.urls')),
    
    # Django admin interface (single instance)
    # SECURITY: Admin authentication is enforced by Django's built-in auth system
    # Ensure LOGIN_URL and authentication middleware are configured in settings.py
    # In production, restrict admin access via settings or use IP whitelisting
    path('admin/', admin.site.urls), 
    
    # Custom admin login view with proper authentication
    path('admin/login/', auth_views.LoginView.as_view(template_name='admin/login.html'), name='admin_login'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)