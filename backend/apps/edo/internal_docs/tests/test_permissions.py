"""Матрица прав: `Document.objects.for_user(user)` + `inbox_for(user)`.

Закрывает критичный код в `models/managers.py` — самый сложный кусок модуля
(visibility по 4-м осям + multi-tenant overlay), на котором уже было 6+ follow-up
коммитов после Phase 1.

Сценарии:
- автор видит свой документ
- посторонний сотрудник той же компании НЕ видит personal_only-документ чужого
- руководитель видит документы своего поддерева Department
- участник коллективного шага (`group:NAME[@company]`) видит документ
- multi-tenant `company_only` режим скрывает чужие компании, override `group_wide` — наоборот
- `inbox_for` отдаёт коллективные шаги участникам нужной группы и не отдаёт чужим
"""

from __future__ import annotations

import pytest
from django.contrib.auth.models import Group

from apps.core.naming import NumberSequence
from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.models import (
    ApprovalChainTemplate,
    Document,
    DocumentType,
    InternalDocFlowConfig,
)
from apps.edo.internal_docs.services import document_service as svc
from apps.users.tests.factories import UserFactory


# ============== fixtures ==============


@pytest.fixture
def two_companies(db):
    """Две независимых компании: Релесофт и Электро. У каждой Отдел + Сектор.

    Department.node_order_by=['name'] → каждый add_root перетасовывает пути
    sibling-узлов под алфавитный порядок. Чтобы возвращаемые инстансы не
    содержали устаревший `path`, перевыбираем их свежими из БД в самом конце.
    """
    rel = OrgUnit.add_root(name="Релесофт", unit_type="company", business_role="internal")
    elc = OrgUnit.add_root(name="Электро", unit_type="company", business_role="internal")

    rel_dept = Department.add_root(name="Отдел РЗА", unit_type="department", company=rel)
    rel_dept.add_child(name="Сектор А", unit_type="sector", company=rel)
    rel_dept.add_child(name="Сектор Б", unit_type="sector", company=rel)
    Department.add_root(name="Отдел ПКЗ", unit_type="department", company=rel)
    Department.add_root(name="Производство", unit_type="department", company=elc)

    return {
        "rel": rel,
        "elc": elc,
        "rel_dept": Department.objects.get(name="Отдел РЗА"),
        "rel_sector": Department.objects.get(name="Сектор А"),
        "rel_sector2": Department.objects.get(name="Сектор Б"),
        "rel_dept_other": Department.objects.get(name="Отдел ПКЗ"),
        "elc_dept": Department.objects.get(name="Производство"),
    }


@pytest.fixture
def accounting_group(db):
    g, _ = Group.objects.get_or_create(name="accounting")
    return g


@pytest.fixture
def admin_group(db):
    g, _ = Group.objects.get_or_create(name="admin")
    return g


def _make_type(*, code, visibility="personal_only", tenancy_override=""):
    seq, _ = NumberSequence.objects.get_or_create(
        name=f"perms-{code}", defaults={"prefix": "P", "pattern": "{prefix}-{####}"},
    )
    chain, _ = ApprovalChainTemplate.objects.get_or_create(
        name=f"perms-{code}",
        defaults={"steps": [{
            "order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve",
        }]},
    )
    return DocumentType.objects.create(
        code=code, name=code, category="memo",
        field_schema=[{"name": "subject", "type": "text"}],
        title_template="{{ subject }}", body_template="{{ subject }}",
        visibility=visibility, tenancy_override=tenancy_override,
        default_chain=chain, numbering_sequence=seq,
    )


@pytest.fixture
def personal_type(db):
    return _make_type(code="t_personal", visibility="personal_only")


@pytest.fixture
def department_type(db):
    return _make_type(code="t_dept", visibility="department_visible")


@pytest.fixture
def public_type(db):
    return _make_type(code="t_public", visibility="public")


@pytest.fixture
def public_group_wide_type(db):
    return _make_type(code="t_public_gw", visibility="public", tenancy_override="group_wide")


@pytest.fixture
def author_with_supervisor(two_companies):
    """Автор в Секторе А, supervisor — head Сектора А (того же узла)."""
    author = UserFactory(
        last_name="Иванов",
        company_unit=two_companies["rel"], department_unit=two_companies["rel_sector"],
    )
    supervisor = UserFactory(
        last_name="Петров",
        company_unit=two_companies["rel"], department_unit=two_companies["rel_sector"],
        is_department_head=True,
    )
    return author, supervisor


@pytest.fixture(autouse=True)
def reset_tenancy_to_company_only(db):
    """Гарантируем известный multi-tenant режим перед каждым тестом."""
    config = InternalDocFlowConfig.get_solo()
    config.cross_company_scope = InternalDocFlowConfig.TenancyScope.COMPANY_ONLY
    config.save()
    yield


def _submit(doc_type, author):
    """Создаёт draft и сразу submit'ит его — нужен для проверки видимости."""
    doc = svc.create_draft(
        author=author, doc_type=doc_type, field_values={"subject": "x"},
    )
    svc.submit(doc, author)
    return doc


# ============== for_user ==============


@pytest.mark.django_db
def test_author_sees_own_document(personal_type, author_with_supervisor):
    author, _ = author_with_supervisor
    doc = _submit(personal_type, author)
    assert doc in Document.objects.for_user(author)


@pytest.mark.django_db
def test_unauthenticated_sees_nothing(personal_type, author_with_supervisor):
    from django.contrib.auth.models import AnonymousUser
    author, _ = author_with_supervisor
    _submit(personal_type, author)
    assert not Document.objects.for_user(AnonymousUser()).exists()


@pytest.mark.django_db
def test_unrelated_coworker_does_not_see_personal(
    personal_type, author_with_supervisor, two_companies,
):
    author, _ = author_with_supervisor
    doc = _submit(personal_type, author)

    # Коллега из той же компании, но другой ветки дерева — не согласующий, не head.
    outsider = UserFactory(
        last_name="Сидоров",
        company_unit=two_companies["rel"], department_unit=two_companies["rel_dept_other"],
    )
    assert doc not in Document.objects.for_user(outsider)


@pytest.mark.django_db
def test_supervisor_sees_via_step(personal_type, author_with_supervisor):
    author, supervisor = author_with_supervisor
    doc = _submit(personal_type, author)
    assert doc in Document.objects.for_user(supervisor)


@pytest.mark.django_db
def test_dept_head_sees_subtree(personal_type, author_with_supervisor, two_companies):
    """Head отдела РЗА видит документы из своих секторов (subtree)."""
    author, _ = author_with_supervisor
    # Head на уровне Отдел РЗА (родитель Сектора А, где работает автор).
    dept_head = UserFactory(
        last_name="Глава",
        company_unit=two_companies["rel"], department_unit=two_companies["rel_dept"],
        is_department_head=True,
    )
    doc = _submit(personal_type, author)
    assert doc in Document.objects.for_user(dept_head)


@pytest.mark.django_db
def test_dept_head_does_not_see_sibling_subtree(
    personal_type, author_with_supervisor, two_companies,
):
    """Head Отдела ПКЗ (другая ветка дерева) не должен видеть документ из Отдела РЗА."""
    author, _ = author_with_supervisor
    other_head = UserFactory(
        last_name="ЧужойГлава",
        company_unit=two_companies["rel"], department_unit=two_companies["rel_dept_other"],
        is_department_head=True,
    )
    doc = _submit(personal_type, author)
    assert doc not in Document.objects.for_user(other_head)


@pytest.mark.django_db
def test_group_step_member_sees_document(
    department_type, author_with_supervisor, two_companies, accounting_group,
):
    """Если в цепочке `group:accounting@company` — все бухгалтеры компании видят документ."""
    author, supervisor = author_with_supervisor
    department_type.default_chain.steps = [
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
        {"order": 2, "role_key": "group:accounting@company", "label": "Бух.", "action": "approve"},
    ]
    department_type.default_chain.save()

    accountant_a = UserFactory(
        last_name="БухА", company_unit=two_companies["rel"],
    )
    accountant_a.groups.add(accounting_group)
    accountant_b = UserFactory(
        last_name="БухБ", company_unit=two_companies["rel"],
    )
    accountant_b.groups.add(accounting_group)

    doc = _submit(department_type, author)
    # Один из них резолвится в `approver`, второй должен видеть как member группы.
    visible = Document.objects.for_user(accountant_a)
    assert doc in visible
    visible_b = Document.objects.for_user(accountant_b)
    assert doc in visible_b


@pytest.mark.django_db
def test_company_only_hides_other_company_public(
    public_type, author_with_supervisor, two_companies,
):
    """company_only режим: public-документ Релесофта не виден сотруднику Электро."""
    author, _ = author_with_supervisor
    elc_user = UserFactory(
        last_name="ЭлектроСотрудник",
        company_unit=two_companies["elc"], department_unit=two_companies["elc_dept"],
    )
    doc = _submit(public_type, author)
    assert doc not in Document.objects.for_user(elc_user)


@pytest.mark.django_db
def test_group_wide_override_overrides_company_only(
    public_group_wide_type, author_with_supervisor, two_companies,
):
    """tenancy_override=group_wide пробивает company_only."""
    author, _ = author_with_supervisor
    elc_user = UserFactory(
        last_name="ЭлектроСотрудник",
        company_unit=two_companies["elc"], department_unit=two_companies["elc_dept"],
    )
    doc = _submit(public_group_wide_type, author)
    assert doc in Document.objects.for_user(elc_user)


@pytest.mark.django_db
def test_admin_group_sees_everything(
    personal_type, author_with_supervisor, admin_group, two_companies,
):
    author, _ = author_with_supervisor
    doc = _submit(personal_type, author)

    admin_user = UserFactory(last_name="Адм", company_unit=two_companies["elc"])
    admin_user.groups.add(admin_group)
    assert doc in Document.objects.for_user(admin_user)


# ============== inbox_for ==============


@pytest.mark.django_db
def test_inbox_personal_assignment(
    personal_type, author_with_supervisor,
):
    author, supervisor = author_with_supervisor
    doc = _submit(personal_type, author)
    inbox = Document.objects.inbox_for(supervisor)
    assert doc in inbox
    # Автор в собственном inbox быть не должен.
    assert doc not in Document.objects.inbox_for(author)


@pytest.mark.django_db
def test_inbox_group_step_visible_to_all_members(
    department_type, author_with_supervisor, two_companies, accounting_group,
):
    """Коллективный шаг `group:accounting@company` — в inbox у всех бухгалтеров компании."""
    author, supervisor = author_with_supervisor
    department_type.default_chain.steps = [
        {"order": 1, "role_key": "group:accounting@company", "label": "Бух.", "action": "approve"},
    ]
    department_type.default_chain.save()

    accountant_a = UserFactory(last_name="БухА", company_unit=two_companies["rel"])
    accountant_b = UserFactory(last_name="БухБ", company_unit=two_companies["rel"])
    accountant_a.groups.add(accounting_group)
    accountant_b.groups.add(accounting_group)

    doc = _submit(department_type, author)
    assert doc in Document.objects.inbox_for(accountant_a)
    assert doc in Document.objects.inbox_for(accountant_b)


@pytest.mark.django_db
def test_inbox_group_scoped_by_company(
    department_type, author_with_supervisor, two_companies, accounting_group,
):
    """`group:NAME@company` фильтрует по author_company_unit — бухгалтер чужой компании НЕ видит."""
    author, supervisor = author_with_supervisor
    department_type.default_chain.steps = [
        {"order": 1, "role_key": "group:accounting@company", "label": "Бух.", "action": "approve"},
    ]
    department_type.default_chain.save()

    # Бухгалтер своей компании нужен, иначе step не резолвится.
    rel_accountant = UserFactory(last_name="БухРел", company_unit=two_companies["rel"])
    rel_accountant.groups.add(accounting_group)

    elc_accountant = UserFactory(
        last_name="БухЭлектро",
        company_unit=two_companies["elc"], department_unit=two_companies["elc_dept"],
    )
    elc_accountant.groups.add(accounting_group)

    doc = _submit(department_type, author)
    assert doc not in Document.objects.inbox_for(elc_accountant)
    assert doc in Document.objects.inbox_for(rel_accountant)


@pytest.mark.django_db
def test_inbox_excludes_non_pending(
    personal_type, author_with_supervisor,
):
    author, supervisor = author_with_supervisor
    doc = _submit(personal_type, author)
    svc.approve(doc, supervisor, comment="ok")
    # После approval документ закрыт — в inbox не должен висеть.
    assert doc not in Document.objects.inbox_for(supervisor)


@pytest.mark.django_db
def test_inbox_user_without_groups_only_personal(
    personal_type, author_with_supervisor,
):
    """Пользователь без групп: видит только персонально назначенные шаги (smoke)."""
    author, supervisor = author_with_supervisor
    doc = _submit(personal_type, author)

    # supervisor не в группе accounting — у него обычный персональный inbox.
    inbox = Document.objects.inbox_for(supervisor)
    assert doc in inbox
