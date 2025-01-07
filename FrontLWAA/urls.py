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

urlpatterns = [
    # Regular application URLs
    path('', include('baseapp.urls')),
    
    # Django admin interface (single instance)
    path('admin/', admin.site.urls), 
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)