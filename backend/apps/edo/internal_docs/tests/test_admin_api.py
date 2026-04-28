"""Тесты админ-CRUD для DocumentType и ApprovalChainTemplate.

Доступ к /admin/ endpoints разрешён только пользователям группы `admin`
(или superuser). Обычный пользователь — 403."""

from __future__ import annotations

import pytest
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

from apps.core.naming import NumberSequence
from apps.edo.internal_docs.models import (
    ApprovalChainTemplate,
    DocumentType,
)
from apps.users.tests.factories import UserFactory


@pytest.fixture
def admin_user(db):
    g, _ = Group.objects.get_or_create(name="admin")
    u = UserFactory(last_name="Админ")
    u.groups.add(g)
    return u


@pytest.fixture
def regular_user(db):
    return UserFactory(last_name="Обычный")


@pytest.fixture
def chain(db):
    return ApprovalChainTemplate.objects.create(
        name="base",
        steps=[
            {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
        ],
    )


@pytest.fixture
def seq(db):
    return NumberSequence.objects.create(name="adm", prefix="A", pattern="{prefix}-{####}")


@pytest.mark.django_db
def test_regular_user_forbidden(regular_user):
    client = APIClient()
    client.force_authenticate(regular_user)
    r = client.get("/api/edo/internal/admin/types/")
    assert r.status_code == 403


@pytest.mark.django_db
def test_anonymous_forbidden():
    client = APIClient()
    r = client.get("/api/edo/internal/admin/chains/")
    assert r.status_code in (401, 403)


@pytest.mark.django_db
def test_admin_can_list_types(admin_user):
    client = APIClient()
    client.force_authenticate(admin_user)
    r = client.get("/api/edo/internal/admin/types/")
    assert r.status_code == 200


@pytest.mark.django_db
def test_admin_can_create_type(admin_user, chain, seq):
    client = APIClient()
    client.force_authenticate(admin_user)
    payload = {
        "code": "test_admin_type",
        "name": "Test admin",
        "category": "memo",
        "field_schema": [{"name": "subject", "type": "text", "required": True}],
        "title_template": "{{ subject }}",
        "body_template": "{{ subject }}",
        "default_chain": chain.pk,
        "numbering_sequence": seq.pk,
        "visibility": "personal_only",
        "addressee_mode": "none",
        "initiator_resolver": "author",
    }
    r = client.post("/api/edo/internal/admin/types/", data=payload, format="json")
    assert r.status_code == 201, r.data
    assert DocumentType.objects.filter(code="test_admin_type").exists()


@pytest.mark.django_db
def test_admin_validates_field_schema(admin_user, chain, seq):
    """Невалидная схема даёт 400."""
    client = APIClient()
    client.force_authenticate(admin_user)
    payload = {
        "code": "bad",
        "name": "B",
        "category": "memo",
        "field_schema": [{"name": "x", "type": "no_such_type"}],
        "title_template": "x",
        "body_template": "x",
        "default_chain": chain.pk,
        "numbering_sequence": seq.pk,
        "visibility": "personal_only",
        "addressee_mode": "none",
        "initiator_resolver": "author",
    }
    r = client.post("/api/edo/internal/admin/types/", data=payload, format="json")
    assert r.status_code == 400


@pytest.mark.django_db
def test_admin_can_create_chain(admin_user):
    client = APIClient()
    client.force_authenticate(admin_user)
    payload = {
        "name": "new chain",
        "steps": [
            {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
            {"order": 2, "role_key": "company_head", "label": "Дир.", "action": "sign"},
        ],
    }
    r = client.post("/api/edo/internal/admin/chains/", data=payload, format="json")
    assert r.status_code == 201
    assert ApprovalChainTemplate.objects.filter(name="new chain").exists()


@pytest.mark.django_db
def test_admin_chain_validates_step_role_key(admin_user):
    client = APIClient()
    client.force_authenticate(admin_user)
    payload = {
        "name": "bad chain",
        "steps": [{"order": 1, "label": "no role"}],  # без role_key
    }
    r = client.post("/api/edo/internal/admin/chains/", data=payload, format="json")
    assert r.status_code == 400


@pytest.mark.django_db
def test_admin_chain_validates_action(admin_user):
    client = APIClient()
    client.force_authenticate(admin_user)
    payload = {
        "name": "bad action",
        "steps": [{"order": 1, "role_key": "supervisor", "action": "invent"}],
    }
    r = client.post("/api/edo/internal/admin/chains/", data=payload, format="json")
    assert r.status_code == 400
