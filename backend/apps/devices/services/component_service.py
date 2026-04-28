"""Service layer for component sync and management."""

import logging

from django.db import transaction
from django.db.models import QuerySet

from apps.devices.models import ComponentType, DeviceComponent

logger = logging.getLogger("devices.components_import")


class ComponentService:
    """Business logic for component management and external sync."""

    @staticmethod
    def get_active_components(search: str = "") -> QuerySet[DeviceComponent]:
        qs = DeviceComponent.objects.filter(is_active=True).select_related("component_type")
        if search:
            from django.db.models import Q

            qs = qs.filter(Q(component_name__icontains=search) | Q(component_type__name__icontains=search))
        return qs

    @staticmethod
    @transaction.atomic
    def sync_component(
        produx_id: int,
        component_name: str,
        component_type_name: str,
        additional_data: dict | None = None,
    ) -> tuple[DeviceComponent, bool]:
        """
        Синхронизация компонента из внешней системы.

        Логика версионирования:
        - Если компонент с produx_id существует и данные изменились:
          старая версия деактивируется, создаётся новая.
        - Если компонент не найден — создаётся новый.

        Returns:
            tuple: (component, created) — компонент и флаг создания.
        """
        comp_type, _ = ComponentType.objects.get_or_create(name=component_type_name)

        existing = DeviceComponent.objects.filter(produx_id=produx_id, is_active=True).first()

        if existing:
            data_changed = (
                existing.component_type.name != comp_type.name
                or existing.component_name != component_name
                or (existing.additional_data or {}).get("import_params") != (additional_data or {}).get("import_params")
            )
            if data_changed:
                existing.is_active = False
                existing.save(update_fields=["is_active", "updated_at"])
                new_component = DeviceComponent.objects.create(
                    produx_id=produx_id,
                    component_name=component_name,
                    component_type=comp_type,
                    additional_data=additional_data,
                    is_active=True,
                )
                logger.info("Updated component (new version): %s", component_name)
                return new_component, True
            else:
                logger.debug("Component unchanged: %s", component_name)
                return existing, False
        else:
            new_component = DeviceComponent.objects.create(
                produx_id=produx_id,
                component_name=component_name,
                component_type=comp_type,
                additional_data=additional_data,
                is_active=True,
            )
            logger.info("Created component: %s", component_name)
            return new_component, True
