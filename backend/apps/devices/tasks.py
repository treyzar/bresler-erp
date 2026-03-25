"""Celery tasks for devices app — component sync from ProdUX API."""

import logging

import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger("devices.components_import")


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def import_components(self):
    """
    Import/sync components from external ProdUX API.

    Authenticates via JWT, fetches component data,
    and uses ComponentService.sync_component() for versioned upsert.
    """
    from apps.devices.services.component_service import ComponentService

    api_url = getattr(settings, "PRODUX_API_URL", "")
    username = getattr(settings, "PRODUX_USERNAME", "")
    password = getattr(settings, "PRODUX_PASSWORD", "")

    if not all([api_url, username, password]):
        logger.error("ProdUX API credentials not configured. Skipping import.")
        return {"status": "error", "reason": "missing_credentials"}

    try:
        # 1. Authenticate — get JWT token
        auth_response = requests.post(
            f"{api_url}/jwt_login",
            json={"email": username, "password": password},
            timeout=30,
        )
        if auth_response.status_code != 200:
            logger.error(
                "Auth failed. Status: %s, Response: %s",
                auth_response.status_code,
                auth_response.text,
            )
            return {"status": "error", "reason": "auth_failed"}

        token = auth_response.json()["token"]
        logger.info("ProdUX auth successful")

        # 2. Fetch component data
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        data_response = requests.get(
            f"{api_url}/order_otm/get_subcategories_by_category",
            headers=headers,
            timeout=30,
        )
        if data_response.status_code != 200:
            logger.error(
                "Data fetch failed. Status: %s, Response: %s",
                data_response.status_code,
                data_response.text,
            )
            return {"status": "error", "reason": "data_fetch_failed"}

        data = data_response.json()
        logger.info("Received %d elements from ProdUX", len(data))

        # 3. Process components
        created_count = 0
        skipped_count = 0

        for element in data:
            main_name = element.get("name")
            if main_name in (None, "-", "Пусто"):
                continue

            # Only process "Блоки терминалов" category
            category_name = element.get("category", {}).get("name")
            if category_name != "Блоки терминалов":
                continue

            for dip in element.get("dipNames", []):
                subcat_id = dip.get("subCategory", {}).get("id")
                if subcat_id != element.get("id"):
                    continue

                comp_name = dip.get("name")
                produx_id = dip.get("id")
                additional_data = {
                    "import_params": {
                        "analogCount": dip.get("analogCount"),
                        "supplyVoltage": dip.get("supplyVoltage"),
                        "digitalInputVoltage": dip.get("digitalInputVoltage"),
                    }
                }

                _, created = ComponentService.sync_component(
                    produx_id=produx_id,
                    component_name=comp_name,
                    component_type_name=main_name,
                    additional_data=additional_data,
                )
                if created:
                    created_count += 1
                else:
                    skipped_count += 1

        logger.info(
            "Import complete. Created/updated: %d, Unchanged: %d",
            created_count,
            skipped_count,
        )
        return {
            "status": "success",
            "created": created_count,
            "unchanged": skipped_count,
        }

    except requests.exceptions.RequestException as exc:
        logger.error("API request error: %s", exc)
        raise self.retry(exc=exc)
    except Exception:
        logger.exception("Unexpected error during import")
        raise
