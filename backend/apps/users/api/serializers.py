from rest_framework import serializers

from apps.users.models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "patronymic",
            "full_name",
            "phone",
            "extension_number",
            "position",
            "department",
            "company",
            "avatar",
            "is_active",
        )
        read_only_fields = ("id", "username", "is_active")


class ProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    groups = serializers.StringRelatedField(many=True, read_only=True)
    allowed_modules = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "patronymic",
            "full_name",
            "phone",
            "extension_number",
            "position",
            "department",
            "company",
            "avatar",
            "groups",
            "allowed_modules",
        )
        read_only_fields = ("id", "username", "groups", "allowed_modules")

    def get_allowed_modules(self, user) -> list[str]:
        if user.is_superuser:
            from apps.users.models import ALL_MODULES
            return ALL_MODULES
        modules: set[str] = set()
        for group in user.groups.select_related("profile").all():
            try:
                modules.update(group.profile.allowed_modules)
            except Exception:
                pass
        return sorted(modules)
