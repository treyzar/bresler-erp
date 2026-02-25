from rest_framework import serializers

from apps.directory.models import (
    City,
    Contact,
    Country,
    DeliveryType,
    Equipment,
    Facility,
    OrgUnit,
    TypeOfWork,
)


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ("id", "name", "code", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class CitySerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source="country.name", read_only=True)

    class Meta:
        model = City
        fields = ("id", "name", "country", "country_name", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class OrgUnitSerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source="country.name", read_only=True, default="")
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = OrgUnit
        fields = (
            "id",
            "name",
            "full_name",
            "unit_type",
            "business_role",
            "is_legal_entity",
            "country",
            "country_name",
            "inn",
            "kpp",
            "ogrn",
            "external_code",
            "address",
            "previous_names",
            "is_active",
            "depth",
            "children_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "depth", "created_at", "updated_at")

    def get_children_count(self, obj):
        return obj.get_children_count()


class OrgUnitTreeSerializer(serializers.ModelSerializer):
    """Compact serializer for tree rendering."""

    children = serializers.SerializerMethodField()

    class Meta:
        model = OrgUnit
        fields = ("id", "name", "unit_type", "business_role", "is_active", "children")

    def get_children(self, obj):
        children = obj.get_children()
        return OrgUnitTreeSerializer(children, many=True).data


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = (
            "id",
            "full_name",
            "position",
            "email",
            "phone",
            "address",
            "city",
            "company",
            "org_units",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = ("id", "name", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class TypeOfWorkSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeOfWork
        fields = ("id", "name", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class DeliveryTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryType
        fields = ("id", "name", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class FacilitySerializer(serializers.ModelSerializer):
    org_unit_name = serializers.CharField(source="org_unit.name", read_only=True, default="")

    class Meta:
        model = Facility
        fields = (
            "id",
            "name",
            "org_unit",
            "org_unit_name",
            "address",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
