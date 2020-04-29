import os
import logging.config
import dj_database_url
from django.core.exceptions import ImproperlyConfigured

project_root = os.path.dirname(os.path.abspath(__file__))


def get_env_var(var_name):
    try:
        env_var = os.environ[var_name]
        if "True" == env_var:
            return True
        elif "False" == env_var:
            return False
        else:
            return env_var
    except KeyError:
        raise ImproperlyConfigured("Set the {} environment variable".format(var_name))


# ENVIRONMENT
# ------------------------------------------------------------------------------

ENVIRONMENT = get_env_var("ENVIRONMENT")

# STATIC DIRS
# ------------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(BASE_DIR, "static")


# SECRET KEY
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/1.10/ref/settings/#std:setting-SECRET_KEY
# SECURITY WARNING: keep the secret key used in production secret!

SECRET_KEY = os.getenv("SECRET_KEY")

# DEBUG
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/1.10/ref/settings/#debug
# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = get_env_var("DEBUG")


# MANAGER CONFIGURATION
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/1.10/ref/settings/#admins
# https://docs.djangoproject.com/en/1.10/ref/settings/#managers

ADMINS = (("""Adam Aaron Mischke""", "mischke@protonmail.com"),)

MANAGERS = ADMINS

ALLOWED_HOSTS = ["*"]

https_only = os.getenv("SECURE_SSL_REDIRECT", True)
SECURE_SSL_REDIRECT = https_only == "True"

# APP CONFIGURATION
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/1.10/ref/settings/#installed-apps

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.db.migrations.migration",
    "django.contrib.staticfiles",
    "corsheaders",
    "django_extensions",
    "django.forms",
]

THIRD_PARTY_APPS = ["whitenoise.runserver_nostatic"]

LOCAL_APPS = ["bitchan"]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# MIDDLEWARE CONFIGURATION
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/1.10/topics/http/middleware/

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
]

# CORS Configuration
cors = os.getenv("CORS_ORIGIN_ALLOW_ALL")
CORS_ORIGIN_ALLOW_ALL = cors == "True"


# URL Configuration
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/1.10/ref/settings/#root-urlconf

ROOT_URLCONF = "bitchan.urls"


# TEMPLATE CONFIGURATION
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/1.10/topics/templates/


FORM_RENDERER = "django.forms.renderers.TemplatesSetting"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(CONTENT_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

# WGSI CONFIGURATION
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/1.10/ref/settings/#wsgi-application

WSGI_APPLICATION = "bitchan.wsgi.application"

# DATABASE CONFIGURATION
# ------------------------------------------------------------------------------
# See: https://docs.djangoproject.com/en/1.10/ref/settings/#databases

DATABASES = {
    "default": dj_database_url.config(
        default="postgres://postgres_user:postgres_password@postgres:5432/postgres_db"
    )
}

# PASSWORD VALIDATION
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/1.10/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation."
        "UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# GENERAL CONFIGURATION
# ------------------------------------------------------------------------------
# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
# https://docs.djangoproject.com/en/1.10/topics/i18n/


LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_L10N = True

USE_TZ = True

SITE_ID = 1


# STATIC FILE CONFIGURATION
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/1.10/howto/static-files/

STATIC_ROOT = os.path.join(CONTENT_DIR, "static")
STATIC_URL = "/static/"

MEDIA_ROOT = os.path.join(CONTENT_DIR, "media")
MEDIA_URL = "/media/"

STATICFILES_DIRS = [os.path.join(CONTENT_DIR, "assets")]


# Logging Configuration
# ------------------------------------------------------------------------------
#

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "root": {"format": "%(levelname)-8s %(message)s"},
        "console": {"format": "%(name)-12s %(levelname)-8s %(message)s"},
        "worker": {"format": "%(name)-50s %(levelname)-8s | %(message)s"},
    },
    "handlers": {
        "root": {"class": "logging.StreamHandler", "formatter": "root"},
        "console": {"class": "logging.StreamHandler", "formatter": "console"},
        "worker": {"class": "logging.StreamHandler", "formatter": "worker"},
    },
    "loggers": {
        "": {"handlers": ["root"], "level": os.getenv("LOG_LEVEL", "warning").upper()},
        "django.db.backends": {"level": os.getenv("BACKEND_LOG_LEVEL", "DEBUG")},
        "django.request": {"level": os.getenv("LOG_LEVEL", "DEBUG").upper()},
    },
}
logging.config.dictConfig(LOGGING)

print("ENVIRONMENT is", ENVIRONMENT)
print("CORS_ORIGIN_ALLOW_ALL is", CORS_ORIGIN_ALLOW_ALL)
print("DEBUG is", DEBUG)
print("SSL is", SECURE_SSL_REDIRECT)
