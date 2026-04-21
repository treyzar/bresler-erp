"""API smoke-тесты: создание, submit, approve, inbox, видимость."""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.core.naming import NumberSequence
from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.models import ApprovalChainTemplate, Document, DocumentType
from apps.users.tests.factories import UserFactory


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def org(db):
    company = OrgUnit.add_root(name="Релесофт", unit_type="company", business_role="internal")
    dept = Department.add_root(name="Отдел 1", unit_type="department", company=company)
    return {"company": company, "dept": dept}


@pytest.fixture
def memo_type(db):
    seq = NumberSequence.objects.create(name="test-api", prefix="API", pattern="{prefix}-{YYYY}-{####}")
    chain = ApprovalChainTemplate.objects.create(
        name="Chain",
        steps=[{"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve", "sla_hours": 24}],
    )
    return DocumentType.objects.create(
        code="api_memo", name="API Memo", category="memo",
        field_schema=[{"name": "subject", "type": "text", "required": True}],
        title_template="Memo «{{ subject }}»",
        body_template="{{ subject }}",
        default_chain=chain, numbering_sequence=seq,
    )


@pytest.fixture
def author(org):
    return UserFactory(
        last_name="Автор", company_unit=org["company"], department_unit=org["dept"],
    )


@pytest.fixture
def supervisor(org):
    return UserFactory(
        last_name="Рук", company_unit=org["company"], department_unit=org["dept"],
        is_department_head=True,
    )


# ---------- types catalog ----------

@pytest.mark.django_db
def test_types_catalog_authenticated(api, author, memo_type):
    api.force_authenticate(author)
    r = api.get("/api/edo/internal/types/")
    assert r.status_code == 200
    codes = [t["code"] for t in r.data.get("results", r.data)]
    assert "api_memo" in codes


@pytest.mark.django_db
def test_types_catalog_requires_auth(api, memo_type):
    r = api.get("/api/edo/internal/types/")
    assert r.status_code == 401


@pytest.mark.django_db
def test_types_filters_by_initiator_group(api, memo_type):
    # Тип с initiator=group:accounting — обычный пользователь его не увидит.
    memo_type.initiator_resolver = "group:accounting"
    memo_type.save()
    u = UserFactory()
    api.force_authenticate(u)
    r = api.get("/api/edo/internal/types/")
    assert r.status_code == 200
    codes = [t["code"] for t in r.data.get("results", r.data)]
    assert "api_memo" not in codes


# ---------- create / list / submit ----------

@pytest.mark.django_db
def test_create_draft(api, author, memo_type):
    api.force_authenticate(author)
    r = api.post("/api/edo/internal/documents/", {
        "type": "api_memo",
        "field_values": {"subject": "Hello"},
    }, format="json")
    assert r.status_code == 201, r.data
    assert r.data["status"] == "draft"
    assert r.data["author"]["id"] == author.pk


@pytest.mark.django_db
def test_submit_creates_chain_and_sets_current_step(api, author, supervisor, memo_type):
    api.force_authenticate(author)
    r = api.post("/api/edo/internal/documents/", {
        "type": "api_memo",
        "field_values": {"subject": "Hi"},
    }, format="json")
    doc_id = r.data["id"]

    r2 = api.post(f"/api/edo/internal/documents/{doc_id}/submit/")
    assert r2.status_code == 200, r2.data
    assert r2.data["status"] == "pending"
    assert r2.data["current_step"] is not None
    assert len(r2.data["steps"]) == 1
    assert r2.data["steps"][0]["approver"]["id"] == supervisor.pk


@pytest.mark.django_db
def test_submit_without_supervisor_returns_400(api, author, memo_type):
    # Нет руководителя → submit должен дать 400 с понятным сообщением.
    api.force_authenticate(author)
    r = api.post("/api/edo/internal/documents/", {
        "type": "api_memo",
        "field_values": {"subject": "x"},
    }, format="json")
    doc_id = r.data["id"]
    r2 = api.post(f"/api/edo/internal/documents/{doc_id}/submit/")
    assert r2.status_code == 400
    assert "согласования" in r2.data["detail"].lower() or "resolve" in r2.data["detail"].lower()


@pytest.mark.django_db
def test_approve_closes_document_with_single_step(api, author, supervisor, memo_type):
    api.force_authenticate(author)
    r = api.post("/api/edo/internal/documents/", {
        "type": "api_memo", "field_values": {"subject": "A"},
    }, format="json")
    doc_id = r.data["id"]
    api.post(f"/api/edo/internal/documents/{doc_id}/submit/")

    api.force_authenticate(supervisor)
    r = api.post(f"/api/edo/internal/documents/{doc_id}/approve/", {"comment": "ok"}, format="json")
    assert r.status_code == 200, r.data
    assert r.data["status"] == "approved"


@pytest.mark.django_db
def test_non_approver_cannot_approve(api, author, supervisor, memo_type):
    api.force_authenticate(author)
    r = api.post("/api/edo/internal/documents/", {
        "type": "api_memo", "field_values": {"subject": "A"},
    }, format="json")
    doc_id = r.data["id"]
    api.post(f"/api/edo/internal/documents/{doc_id}/submit/")

    other = UserFactory()
    api.force_authenticate(other)
    r = api.post(f"/api/edo/internal/documents/{doc_id}/approve/", {"comment": ""}, format="json")
    # Автор не видит документ (другая компания), поэтому 404. supervisor видит и может approve.
    assert r.status_code in (403, 404)


@pytest.mark.django_db
def test_reject_requires_comment(api, author, supervisor, memo_type):
    api.force_authenticate(author)
    r = api.post("/api/edo/internal/documents/", {
        "type": "api_memo", "field_values": {"subject": "A"},
    }, format="json")
    doc_id = r.data["id"]
    api.post(f"/api/edo/internal/documents/{doc_id}/submit/")

    api.force_authenticate(supervisor)
    r = api.post(f"/api/edo/internal/documents/{doc_id}/reject/", {"comment": ""}, format="json")
    assert r.status_code == 400


# ---------- inbox / outbox ----------

@pytest.mark.django_db
def test_inbox_tab_shows_assigned_docs(api, author, supervisor, memo_type):
    api.force_authenticate(author)
    r = api.post("/api/edo/internal/documents/", {
        "type": "api_memo", "field_values": {"subject": "A"},
    }, format="json")
    doc_id = r.data["id"]
    api.post(f"/api/edo/internal/documents/{doc_id}/submit/")

    api.force_authenticate(supervisor)
    r = api.get("/api/edo/internal/documents/?tab=inbox")
    assert r.status_code == 200
    rows = r.data.get("results", r.data)
    assert any(row["id"] == doc_id for row in rows)


@pytest.mark.django_db
def test_inbox_count_endpoint(api, author, supervisor, memo_type):
    api.force_authenticate(author)
    r = api.post("/api/edo/internal/documents/", {
        "type": "api_memo", "field_values": {"subject": "A"},
    }, format="json")
    doc_id = r.data["id"]
    api.post(f"/api/edo/internal/documents/{doc_id}/submit/")

    api.force_authenticate(supervisor)
    r = api.get("/api/edo/internal/documents/inbox-count/")
    assert r.status_code == 200
    assert r.data["count"] >= 1


@pytest.mark.django_db
def test_drafts_tab_private_to_author(api, author, memo_type):
    api.force_authenticate(author)
    api.post("/api/edo/internal/documents/", {
        "type": "api_memo", "field_values": {"subject": "A"},
    }, format="json")

    other = UserFactory()
    api.force_authenticate(other)
    r = api.get("/api/edo/internal/documents/?tab=drafts")
    assert r.status_code == 200
    rows = r.data.get("results", r.data)
    assert not any(row["author"]["id"] == author.pk for row in rows)


# ---------- destroy (cancel draft) ----------

@pytest.mark.django_db
def test_destroy_draft_cancels_it(api, author, memo_type):
    api.force_authenticate(author)
    r = api.post("/api/edo/internal/documents/", {
        "type": "api_memo", "field_values": {"subject": "x"},
    }, format="json")
    doc_id = r.data["id"]
    r2 = api.delete(f"/api/edo/internal/documents/{doc_id}/")
    assert r2.status_code == 204
    doc = Document.objects.get(pk=doc_id)
    assert doc.status == "cancelled"


# ---------- visibility ----------

@pytest.mark.django_db
def test_user_from_other_company_does_not_see_document(api, author, supervisor, memo_type):
    api.force_authenticate(author)
    r = api.post("/api/edo/internal/documents/", {
        "type": "api_memo", "field_values": {"subject": "A"},
    }, format="json")
    doc_id = r.data["id"]
    api.post(f"/api/edo/internal/documents/{doc_id}/submit/")

    other_company = OrgUnit.add_root(name="ДругаяКо", unit_type="company", business_role="internal")
    outsider = UserFactory(last_name="Чужой", company_unit=other_company)

    api.force_authenticate(outsider)
    r = api.get(f"/api/edo/internal/documents/{doc_id}/")
    assert r.status_code == 404
