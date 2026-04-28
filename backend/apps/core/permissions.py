from rest_framework.permissions import BasePermission


class IsOwnerOrReadOnly(BasePermission):
    """Allow owners to edit, others to read only."""

    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return hasattr(obj, "user") and obj.user == request.user


def HasModuleAccess(module: str) -> type:
    """
    Returns a DRF permission class that grants access only if the user belongs
    to a group whose GroupProfile.allowed_modules includes the given module slug.
    Superusers always have full access.

    Usage:
        permission_classes = [IsAuthenticated, HasModuleAccess('edo')]
    """

    class _HasModuleAccess(BasePermission):
        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            if request.user.is_superuser:
                return True
            return request.user.groups.filter(profile__allowed_modules__contains=[module]).exists()

    _HasModuleAccess.__name__ = f"HasModuleAccess_{module}"
    return _HasModuleAccess
