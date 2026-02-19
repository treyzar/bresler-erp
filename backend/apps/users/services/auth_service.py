from django.contrib.auth import authenticate

from apps.users.models import User


def authenticate_user(username: str, password: str) -> User | None:
    """Authenticate user with username and password."""
    return authenticate(username=username, password=password)
