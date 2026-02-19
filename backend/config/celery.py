"""
Celery configuration for Bresler ERP project.
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("bresler_erp")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
