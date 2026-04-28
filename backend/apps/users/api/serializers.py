import contextlib

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.users.models import User


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Неверный текущий пароль")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Пароли не совпадают"})
        return attrs


class AvatarSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("avatar",)


def _avatar_url(user) -> str | None:
    """Return relative avatar URL (avoids Docker internal hostname in absolute URLs)."""
    if user.avatar:
        return user.avatar.url
    return None


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    avatar = serializers.SerializerMethodField()

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

    def get_avatar(self, obj) -> str | None:
        return _avatar_url(obj)


class ProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    avatar = serializers.SerializerMethodField()
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
            "is_department_head",
            "groups",
            "allowed_modules",
            "date_joined",
            "last_login",
        )
        read_only_fields = (
            "id",
            "username",
            "is_department_head",
            "groups",
            "allowed_modules",
            "date_joined",
            "last_login",
        )

    def get_avatar(self, obj) -> str | None:
        return _avatar_url(obj)

    def get_allowed_modules(self, user) -> list[str]:
        if user.is_superuser:
            from apps.users.models import ALL_MODULES

            return ALL_MODULES
        modules: set[str] = set()
        for group in user.groups.select_related("profile").all():
            with contextlib.suppress(Exception):
                modules.update(group.profile.allowed_modules)
        return sorted(modules)
