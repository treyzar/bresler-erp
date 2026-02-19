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
        )
        read_only_fields = ("id", "username", "groups")
