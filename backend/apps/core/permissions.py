from rest_framework.permissions import BasePermission


class IsOwnerOrReadOnly(BasePermission):
    """Allow owners to edit, others to read only."""

    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return hasattr(obj, "user") and obj.user == request.user
