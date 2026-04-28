"""Service layer for DeviceRZA and ModRZA operations."""

from django.db import transaction
from django.db.models import Count, Q, QuerySet

from apps.devices.models import (
    DeviceRZA,
    DeviceRZAComponent,
    DeviceRZAParameter,
    ModRZA,
    ModRZAComponent,
    ModRZAParameter,
)


class DeviceService:
    """Business logic for RZA device management."""

    @staticmethod
    def get_devices(search: str = "") -> QuerySet[DeviceRZA]:
        qs = DeviceRZA.objects.annotate(
            modifications_count=Count("modifications"),
            parameters_count=Count("device_parameters"),
            components_count=Count("device_components"),
        )
        if search:
            qs = qs.filter(
                Q(rza_name__icontains=search) | Q(rza_code__icontains=search) | Q(rza_short_name__icontains=search)
            )
        return qs

    @staticmethod
    def get_device_detail(device_id: int) -> DeviceRZA:
        return (
            DeviceRZA.objects.prefetch_related(
                "modifications",
                "device_parameters__parameter",
                "device_components__component",
            )
            .annotate(modifications_count=Count("modifications"))
            .get(pk=device_id)
        )

    @staticmethod
    def get_modifications(device_id: int, search: str = "") -> QuerySet[ModRZA]:
        qs = ModRZA.objects.filter(device_rza_id=device_id).annotate(
            parameters_count=Count("mod_parameters"),
            components_count=Count("mod_components"),
        )
        if search:
            qs = qs.filter(
                Q(mod_name__icontains=search) | Q(mod_code__icontains=search) | Q(alter_mod_code__icontains=search)
            )
        return qs

    @staticmethod
    @transaction.atomic
    def add_parameter_to_device(device_id: int, parameter_id: int, price=0):
        return DeviceRZAParameter.objects.get_or_create(
            device_rza_id=device_id,
            parameter_id=parameter_id,
            defaults={"price": price},
        )

    @staticmethod
    @transaction.atomic
    def remove_parameter_from_device(device_id: int, parameter_id: int):
        return DeviceRZAParameter.objects.filter(device_rza_id=device_id, parameter_id=parameter_id).delete()

    @staticmethod
    @transaction.atomic
    def add_component_to_device(device_id: int, component_id: int, price=0):
        return DeviceRZAComponent.objects.get_or_create(
            device_rza_id=device_id,
            component_id=component_id,
            defaults={"price": price},
        )

    @staticmethod
    @transaction.atomic
    def remove_component_from_device(device_id: int, component_id: int):
        return DeviceRZAComponent.objects.filter(device_rza_id=device_id, component_id=component_id).delete()

    @staticmethod
    @transaction.atomic
    def add_parameter_to_modification(mod_id: int, parameter_id: int, price=0):
        return ModRZAParameter.objects.get_or_create(
            mod_rza_id=mod_id,
            parameter_id=parameter_id,
            defaults={"price": price},
        )

    @staticmethod
    @transaction.atomic
    def remove_parameter_from_modification(mod_id: int, parameter_id: int):
        return ModRZAParameter.objects.filter(mod_rza_id=mod_id, parameter_id=parameter_id).delete()

    @staticmethod
    @transaction.atomic
    def add_component_to_modification(mod_id: int, component_id: int, price=0):
        return ModRZAComponent.objects.get_or_create(
            mod_rza_id=mod_id,
            component_id=component_id,
            defaults={"price": price},
        )

    @staticmethod
    @transaction.atomic
    def remove_component_from_modification(mod_id: int, component_id: int):
        return ModRZAComponent.objects.filter(mod_rza_id=mod_id, component_id=component_id).delete()

    @staticmethod
    def get_available_parameters_for_device(device_id: int):
        """Параметры, ещё не привязанные к серии."""
        from apps.devices.models import Parameter

        assigned_ids = DeviceRZAParameter.objects.filter(device_rza_id=device_id).values_list("parameter_id", flat=True)
        return Parameter.objects.filter(_is_leaf=True).exclude(pk__in=assigned_ids)

    @staticmethod
    def get_available_components_for_device(device_id: int):
        """Компоненты, ещё не привязанные к серии."""
        from apps.devices.models import DeviceComponent

        assigned_ids = DeviceRZAComponent.objects.filter(device_rza_id=device_id).values_list("component_id", flat=True)
        return DeviceComponent.objects.filter(is_active=True).exclude(pk__in=assigned_ids)

    @staticmethod
    def get_available_parameters_for_modification(mod_id: int):
        from apps.devices.models import Parameter

        assigned_ids = ModRZAParameter.objects.filter(mod_rza_id=mod_id).values_list("parameter_id", flat=True)
        return Parameter.objects.filter(_is_leaf=True).exclude(pk__in=assigned_ids)

    @staticmethod
    def get_available_components_for_modification(mod_id: int):
        from apps.devices.models import DeviceComponent

        assigned_ids = ModRZAComponent.objects.filter(mod_rza_id=mod_id).values_list("component_id", flat=True)
        return DeviceComponent.objects.filter(is_active=True).exclude(pk__in=assigned_ids)
