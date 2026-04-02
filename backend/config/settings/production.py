"""
Production settings for Bresler ERP.
"""

import os

from .base import *  # noqa: F401, F403

DEBUG = False

ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",")

# Security
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Email — use real SMTP in production
EMAIL_BACKEND = os.environ.get("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")

# CORS
CORS_ALLOWED_ORIGINS = os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")

# ── LDAP Authentication (Active Directory) ──
# Activated when AUTH_LDAP_SERVER_URI is set in environment.
# Falls back to local ModelBackend if LDAP is not configured.

_ldap_server = os.environ.get("AUTH_LDAP_SERVER_URI", "")

if _ldap_server:
    import ldap
    from django_auth_ldap.config import ActiveDirectoryGroupType, LDAPSearch

    # LDAP protocol options
    ldap.set_option(ldap.OPT_PROTOCOL_VERSION, 3)
    ldap.set_option(ldap.OPT_REFERRALS, 0)
    ldap.set_option(ldap.OPT_NETWORK_TIMEOUT, 10)

    AUTHENTICATION_BACKENDS = [
        "django_auth_ldap.backend.LDAPBackend",
        "django.contrib.auth.backends.ModelBackend",
    ]

    # Connection
    AUTH_LDAP_SERVER_URI = _ldap_server
    AUTH_LDAP_BIND_DN = os.environ.get(
        "AUTH_LDAP_BIND_DN",
        "CN=marketing,CN=Users,DC=local,DC=bresler,DC=ru",
    )
    AUTH_LDAP_BIND_PASSWORD = os.environ.get("AUTH_LDAP_BIND_PASSWORD", "")

    # User search — sAMAccountName in AD, restricted to members of the app group
    _ldap_search_base = os.environ.get(
        "AUTH_LDAP_SEARCH_BASE",
        "DC=local,DC=bresler,DC=ru",
    )
    _ldap_require_group = os.environ.get(
        "AUTH_LDAP_REQUIRE_GROUP",
        "CN=marketing_app_users,OU=Groups,OU=Bresler,DC=local,DC=bresler,DC=ru",
    )
    AUTH_LDAP_USER_SEARCH = LDAPSearch(
        _ldap_search_base,
        ldap.SCOPE_SUBTREE,
        "(&(sAMAccountName=%(user)s)(memberOf=" + _ldap_require_group + "))",
    )

    # Map LDAP attributes → Django User fields
    AUTH_LDAP_USER_ATTR_MAP = {
        "first_name": "givenName",
        "last_name": "sn",
        "email": "mail",
    }

    AUTH_LDAP_ALWAYS_UPDATE_USER = True

    # Group search
    _ldap_group_base = os.environ.get(
        "AUTH_LDAP_GROUP_SEARCH_BASE",
        "OU=Groups,OU=Bresler,DC=local,DC=bresler,DC=ru",
    )
    AUTH_LDAP_GROUP_SEARCH = LDAPSearch(
        _ldap_group_base,
        ldap.SCOPE_SUBTREE,
        "(objectClass=group)",
    )
    AUTH_LDAP_GROUP_TYPE = ActiveDirectoryGroupType()

    AUTH_LDAP_MIRROR_GROUPS = False
    AUTH_LDAP_FIND_GROUP_PERMS = False

    # Logging
    import logging

    _ldap_logger = logging.getLogger("django_auth_ldap")
    _ldap_logger.addHandler(logging.StreamHandler())
    _ldap_logger.setLevel(
        logging.DEBUG if os.environ.get("AUTH_LDAP_DEBUG", "").lower() in ("true", "1") else logging.WARNING
    )
