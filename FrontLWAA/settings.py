"""
Django settings for FrontLWAA project.

Generated by 'django-admin startproject' using Django 5.1.4.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.1/ref/settings/
"""

from pathlib import Path
from dotenv import load_dotenv
import dj_database_url
from urllib.parse import urlparse
import django_heroku
import cloudinary
import cloudinary.uploader
import cloudinary.api
import os

load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent



# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    # Only try to read from file if SECRET_KEY isn't in environment
    try:
        with open(os.path.join(BASE_DIR, 'secret_key.txt')) as f:
            SECRET_KEY = f.read().strip()
    except FileNotFoundError:
        raise Exception('No SECRET_KEY found in environment or secret_key.txt')
    
# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = ['workforcecompass.com', 'www.workforcecompass.com']

# Application definition
INSTALLED_APPS = [
    'baseapp.apps.BaseappConfig',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'crispy_forms',
    'crispy_bootstrap5',
    'webpack_loader',
    'cloudinary',
]

MIDDLEWARE = [
    'baseapp.middleware.SecurityMiddleware',
    'baseapp.middleware.SecurityHeadersMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'FrontLWAA.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'baseapp', 'templates'),],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'FrontLWAA.wsgi.application'

database_url = os.environ.get('JAWSDB_URL')

if database_url:
    # Production settings (Heroku with MySQL)
    db_info = urlparse(database_url)
    
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': db_info.path[1:],
            'USER': db_info.username,
            'PASSWORD': db_info.password,
            'HOST': db_info.hostname,
            'PORT': db_info.port or '3306',
            'OPTIONS': {
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            }
        }
    }
else:
    # Local development settings (SQLite)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'America/New_York'
USE_I18N = True
USE_TZ = True

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom Settings
AUTH_USER_MODEL = 'baseapp.CustomUser'
CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
CRISPY_TEMPLATE_PACK = "bootstrap5"

LOGIN_URL = 'baseapp:login'
LOGIN_REDIRECT_URL = 'baseapp:dashboard'
LOGOUT_REDIRECT_URL = 'baseapp:login'

# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.sendgrid.net'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'apikey'
EMAIL_HOST_PASSWORD = os.environ.get('SENDGRID_API_KEY')
DEFAULT_FROM_EMAIL = 'info@workforcecompass.com'

X_FRAME_OPTIONS = 'SAMEORIGIN'

# Cloudinary configuration
cloudinary_url = os.environ.get('CLOUDINARY_URL')
if cloudinary_url:
    # This uses the CLOUDINARY_URL environment variable set by the Heroku add-on
    cloudinary.config(cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
                     api_key=os.environ.get('CLOUDINARY_API_KEY'),
                     api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
                     secure=True)
else:
    # Fallback for local development if needed
    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
        api_key=os.environ.get('CLOUDINARY_API_KEY', ''),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET', ''),
        secure=True
    )

# File Storage Configuration
DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# Media files (for local development)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Static files configuration
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    ("webpack-dist", BASE_DIR / "webpack-dist"),
    os.path.join(BASE_DIR, 'baseapp', 'static'),
]
STATIC_ROOT = BASE_DIR / "staticfiles"

REPORTS_DIR = os.path.join(MEDIA_ROOT, 'assessment_reports')
os.makedirs(REPORTS_DIR, exist_ok=True)

# Whitenoise configuration
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'debug.log'),
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'baseapp': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'weasyprint': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'cloudinary': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

WEBPACK_LOADER = {
    'DEFAULT': {
        'CACHE': not DEBUG,
        'STATS_FILE': BASE_DIR / 'webpack-stats.json',
        'POLL_INTERVAL': 0.1,
        'TIMEOUT': None,
        'IGNORE': [r'.+\.hot-update.js', r'.+\.map'],
    }
}

# Simple database caching configuration - no additional add-ons needed
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'django_cache_table',
    }
}

# Cache timeout for benchmark results (24 hours by default)
BENCHMARK_CACHE_TIMEOUT = int(os.environ.get('BENCHMARK_CACHE_TIMEOUT', 86400))

# For Heroku's ephemeral filesystem, use /tmp for temporary files
TEMP_REPORT_DIR = '/tmp/assessment_reports'
os.makedirs(TEMP_REPORT_DIR, exist_ok=True)

BENCHMARK_CACHE_TIMEOUT = int(os.environ.get('BENCHMARK_CACHE_TIMEOUT', 86400))  # 24 hours
REPORT_CACHE_TIMEOUT = int(os.environ.get('REPORT_CACHE_TIMEOUT', 86400))       # 24 hours
LOGO_CACHE_TIMEOUT = int(os.environ.get('LOGO_CACHE_TIMEOUT', 604800))  

# Call django_heroku settings with staticfiles=False
django_heroku.settings(locals(), staticfiles=False)