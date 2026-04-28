"""Тесты ChainResolver. Покрываем все 10 резолверов + build_approval_steps."""

import pytest
from django.contrib.auth.models import Group

from apps.directory.models import Department, OrgUnit
from apps.edo.internal_docs.services.chain_resolver import (
    ResolveError,
    build_approval_steps,
    resolve,
)
from apps.users.tests.factories import UserFactory


@pytest.fixture
def tree(db):
    """Релесофт → Служба РЗА → Отдел 1 → Сектор А (+ Сектор Б), Отдел 2."""
    company = OrgUnit.add_root(
        name="Релесофт",
        unit_type="company",
        business_role="internal",
    )
    service = Department.add_root(name="Служба РЗА", unit_type="service", company=company)
    dept1 = service.add_child(name="Отдел РЗА 1", unit_type="department", company=company)
    sector_a = dept1.add_child(name="Сектор А", unit_type="sector", company=company)
    sector_b = dept1.add_child(name="Сектор Б", unit_type="sector", company=company)
    dept2 = service.add_child(name="Отдел РЗА 2", unit_type="department", company=company)
    return {
        "company": company,
        "service": service,
        "dept1": dept1,
        "sector_a": sector_a,
        "sector_b": sector_b,
        "dept2": dept2,
    }


@pytest.fixture
def company2(db, tree):
    """Вторая компания, чтобы тестить @company scope."""
    comp = OrgUnit.add_root(name="ДругаяКо", unit_type="company", business_role="internal")
    return comp


@pytest.fixture
def accounting_group(db):
    g, _ = Group.objects.get_or_create(name="accounting")
    return g


# ---------- author / supervisor / fixed_user ----------


@pytest.mark.django_db
def test_author_returns_self(tree):
    user = UserFactory(department_unit=tree["sector_a"])
    assert resolve("author", user).pk == user.pk


@pytest.mark.django_db
def test_supervisor_via_resolve(tree):
    boss = UserFactory(department_unit=tree["dept1"], is_department_head=True)
    emp = UserFactory(department_unit=tree["sector_a"])
    assert resolve("supervisor", emp).pk == boss.pk


@pytest.mark.django_db
def test_supervisor_returns_none_when_no_chain():
    emp = UserFactory(department_unit=None, company_unit=None, supervisor=None)
    assert resolve("supervisor", emp) is None


@pytest.mark.django_db
def test_fixed_user_by_id(tree):
    target = UserFactory()
    author = UserFactory()
    assert resolve(f"fixed_user:{target.pk}", author).pk == target.pk


@pytest.mark.django_db
def test_fixed_user_inactive_returns_none():
    inactive = UserFactory(is_active=False)
    author = UserFactory()
    assert resolve(f"fixed_user:{inactive.pk}", author) is None


@pytest.mark.django_db
def test_fixed_user_bad_id_raises():
    author = UserFactory()
    with pytest.raises(ResolveError):
        resolve("fixed_user:abc", author)


# ---------- dept_head ----------


@pytest.mark.django_db
def test_dept_head_self(tree):
    head = UserFactory(department_unit=tree["sector_a"], is_department_head=True)
    emp = UserFactory(department_unit=tree["sector_a"])
    assert resolve("dept_head:self", emp).pk == head.pk


@pytest.mark.django_db
def test_dept_head_parent(tree):
    head_parent = UserFactory(department_unit=tree["dept1"], is_department_head=True)
    emp = UserFactory(department_unit=tree["sector_a"])
    assert resolve("dept_head:parent", emp).pk == head_parent.pk


@pytest.mark.django_db
def test_dept_head_up_n(tree):
    head_service = UserFactory(department_unit=tree["service"], is_department_head=True)
    emp = UserFactory(department_unit=tree["sector_a"])
    # up(2): sector_a → dept1 → service
    assert resolve("dept_head:up(2)", emp).pk == head_service.pk


@pytest.mark.django_db
def test_dept_head_walks_up_if_no_head_in_target(tree):
    """В dept1 нет head, в service есть — dept_head:parent должен подняться."""
    head_service = UserFactory(department_unit=tree["service"], is_department_head=True)
    emp = UserFactory(department_unit=tree["sector_a"])
    assert resolve("dept_head:parent", emp).pk == head_service.pk


@pytest.mark.django_db
def test_dept_head_falls_back_to_company_head(tree):
    """Если поднялись до корня Department — fallback на company_head."""
    director = UserFactory(
        company_unit=tree["company"],
        department_unit=None,
        is_department_head=True,
    )
    emp = UserFactory(
        company_unit=tree["company"],
        department_unit=tree["sector_a"],
    )
    # В дереве Department никого нет; резолвер дойдёт до root и пойдёт на company.
    assert resolve("dept_head:up(10)", emp).pk == director.pk


@pytest.mark.django_db
def test_dept_head_none_if_no_department_unit():
    emp = UserFactory(department_unit=None)
    assert resolve("dept_head:self", emp) is None


@pytest.mark.django_db
def test_dept_head_up_zero_raises(tree):
    emp = UserFactory(department_unit=tree["sector_a"])
    with pytest.raises(ResolveError):
        resolve("dept_head:up(0)", emp)


@pytest.mark.django_db
def test_dept_head_bad_args_raises(tree):
    emp = UserFactory(department_unit=tree["sector_a"])
    with pytest.raises(ResolveError):
        resolve("dept_head:xxx", emp)


# ---------- company_head ----------


@pytest.mark.django_db
def test_company_head(tree):
    director = UserFactory(
        company_unit=tree["company"],
        department_unit=None,
        is_department_head=True,
    )
    emp = UserFactory(company_unit=tree["company"], department_unit=tree["sector_a"])
    assert resolve("company_head", emp).pk == director.pk


@pytest.mark.django_db
def test_company_head_ignores_heads_of_subdepartments(tree):
    """Heads сабдепартментов (depth >= 2) НЕ должны подбираться как company_head —
    fallback идёт только на корневые (depth=1) Department."""
    UserFactory(
        company_unit=tree["company"],
        department_unit=tree["dept1"],
        is_department_head=True,
    )
    emp = UserFactory(company_unit=tree["company"], department_unit=tree["sector_a"])
    assert resolve("company_head", emp) is None


@pytest.mark.django_db
def test_company_head_fallback_to_root_department_head(tree):
    """Если нет department_unit=NULL директора, но есть head корневого Department
    (например, "Руководство" / "Служба РЗА") — резолвер находит его."""
    # `tree["service"]` — это root Department (depth=1).
    director_in_root = UserFactory(
        last_name="Директоров",
        company_unit=tree["company"],
        department_unit=tree["service"],
        is_department_head=True,
    )
    emp = UserFactory(company_unit=tree["company"], department_unit=tree["sector_a"])
    assert resolve("company_head", emp).pk == director_in_root.pk


@pytest.mark.django_db
def test_company_head_primary_wins_over_fallback(tree):
    """Если есть и department_unit=NULL директор, и head корневого Department —
    выбирается тот, что без department_unit (primary)."""
    primary = UserFactory(
        last_name="Главный",
        company_unit=tree["company"],
        department_unit=None,
        is_department_head=True,
    )
    UserFactory(
        last_name="ГлаваСлужбы",
        company_unit=tree["company"],
        department_unit=tree["service"],
        is_department_head=True,
    )
    emp = UserFactory(company_unit=tree["company"], department_unit=tree["sector_a"])
    assert resolve("company_head", emp).pk == primary.pk


@pytest.mark.django_db
def test_dept_head_type_finds_nearest_ancestor_of_type(tree):
    """dept_head_type:service ищет ближайший вверх узел типа service.

    Дерево: service (depth=1) → dept1 (depth=2) → sector_a (depth=3).
    """
    head_service = UserFactory(
        last_name="ГлаваСлужбы",
        department_unit=tree["service"],
        is_department_head=True,
    )
    emp = UserFactory(department_unit=tree["sector_a"])
    assert resolve("dept_head_type:service", emp).pk == head_service.pk


@pytest.mark.django_db
def test_dept_head_type_picks_closest_when_multiple(tree):
    """Если в дереве несколько узлов одного unit_type — берётся ближайший вверх."""
    # Дерево tree: service(service) → dept1(department) → sector_a(sector).
    # Добавим ещё один уровень "department" под sector_a (искусственно).
    sub_dept = tree["sector_a"].add_child(
        name="Подотдел",
        unit_type="department",
        company=tree["company"],
    )
    head_close = UserFactory(
        last_name="Близкий",
        department_unit=sub_dept,
        is_department_head=True,
    )
    UserFactory(  # head того же типа на dept1, но он дальше — не должен быть выбран
        last_name="Дальний",
        department_unit=tree["dept1"],
        is_department_head=True,
    )
    emp = UserFactory(department_unit=sub_dept)
    # emp в подотделе с unit_type=department; ищем dept_head_type:department —
    # ближайший = sub_dept сам, head = head_close.
    assert resolve("dept_head_type:department", emp).pk == head_close.pk


@pytest.mark.django_db
def test_dept_head_type_none_if_no_match(tree):
    emp = UserFactory(department_unit=tree["sector_a"])
    # В дереве нет ни одного управления (unit_type=management).
    assert resolve("dept_head_type:management", emp) is None


@pytest.mark.django_db
def test_dept_head_type_no_args_raises(tree):
    emp = UserFactory(department_unit=tree["sector_a"])
    with pytest.raises(ResolveError):
        resolve("dept_head_type:", emp)


@pytest.mark.django_db
def test_dept_head_type_no_department_returns_none():
    emp = UserFactory(department_unit=None)
    assert resolve("dept_head_type:service", emp) is None


@pytest.mark.django_db
def test_unresolved_step_error_message_has_hint(tree):
    """Сообщение об ошибке должно содержать подсказку для админа: что настроить."""
    from apps.edo.internal_docs.services.chain_resolver import build_approval_steps

    # Нет ни одного company_head в этом дереве → step упадёт с подсказкой.
    emp = UserFactory(
        last_name="Тестов",
        company_unit=tree["company"],
        department_unit=tree["sector_a"],
    )
    chain_steps = [
        {"order": 1, "role_key": "company_head", "label": "Директор", "action": "approve"},
    ]
    with pytest.raises(ResolveError) as exc:
        build_approval_steps(chain_steps, emp)
    msg = str(exc.value)
    assert "Шаг #1 «Директор»" in msg
    assert "Не найден директор компании" in msg
    assert "is_department_head=True" in msg


# ---------- group / group_head ----------


@pytest.mark.django_db
def test_group_picks_any_active_member(tree, accounting_group):
    accountant = UserFactory(last_name="Аксенова")
    accountant.groups.add(accounting_group)
    author = UserFactory(last_name="Зайцев")
    assert resolve("group:accounting", author).pk == accountant.pk


@pytest.mark.django_db
def test_group_deterministic_by_last_name(tree, accounting_group):
    a = UserFactory(last_name="Яшин")
    b = UserFactory(last_name="Абрамов")
    a.groups.add(accounting_group)
    b.groups.add(accounting_group)
    author = UserFactory(last_name="Иванов")
    # Abramov first alphabetically
    assert resolve("group:accounting", author).pk == b.pk


@pytest.mark.django_db
def test_group_scope_company(tree, company2, accounting_group):
    acc_here = UserFactory(company_unit=tree["company"])
    acc_other = UserFactory(company_unit=company2)
    acc_here.groups.add(accounting_group)
    acc_other.groups.add(accounting_group)
    author = UserFactory(company_unit=tree["company"])
    got = resolve("group:accounting@company", author)
    assert got.pk == acc_here.pk


@pytest.mark.django_db
def test_group_scope_company_none_without_company_unit(tree, accounting_group):
    acc = UserFactory(company_unit=tree["company"])
    acc.groups.add(accounting_group)
    author = UserFactory(company_unit=None)
    assert resolve("group:accounting@company", author) is None


@pytest.mark.django_db
def test_group_empty_name_raises():
    author = UserFactory()
    with pytest.raises(ResolveError):
        resolve("group:", author)


@pytest.mark.django_db
def test_group_head_only_with_is_department_head(tree, accounting_group):
    regular = UserFactory(last_name="Первый", is_department_head=False)
    chief = UserFactory(last_name="Чиф", is_department_head=True)
    regular.groups.add(accounting_group)
    chief.groups.add(accounting_group)
    author = UserFactory()
    assert resolve("group_head:accounting", author).pk == chief.pk


# ---------- field_user / field_dept_head ----------


@pytest.mark.django_db
def test_field_user_reads_from_field_values():
    target = UserFactory()
    author = UserFactory()
    got = resolve("field_user:addressee", author, field_values={"addressee": target.pk})
    assert got.pk == target.pk


@pytest.mark.django_db
def test_field_user_missing_field_returns_none():
    author = UserFactory()
    assert resolve("field_user:addressee", author, field_values={}) is None


@pytest.mark.django_db
def test_field_user_invalid_value_returns_none():
    author = UserFactory()
    assert resolve("field_user:x", author, field_values={"x": "not-an-id"}) is None


@pytest.mark.django_db
def test_field_dept_head(tree):
    head = UserFactory(department_unit=tree["dept2"], is_department_head=True)
    author = UserFactory(department_unit=tree["sector_a"])
    got = resolve(
        "field_dept_head:target",
        author,
        field_values={"target": tree["dept2"].pk},
    )
    assert got.pk == head.pk


# ---------- unknown role_key ----------


@pytest.mark.django_db
def test_unknown_role_key_raises():
    author = UserFactory()
    with pytest.raises(ResolveError):
        resolve("made_up", author)


# ---------- build_approval_steps ----------


@pytest.mark.django_db
def test_build_chain_resolves_and_orders(tree, accounting_group):
    sector_head = UserFactory(department_unit=tree["sector_a"], is_department_head=True)
    dept_head = UserFactory(department_unit=tree["dept1"], is_department_head=True)
    accountant = UserFactory(company_unit=tree["company"])
    accountant.groups.add(accounting_group)
    author = UserFactory(company_unit=tree["company"], department_unit=tree["sector_a"])

    steps = [
        {"order": 1, "role_key": "supervisor", "label": "Руководитель", "action": "approve"},
        {"order": 2, "role_key": "dept_head:parent", "label": "Руководитель отдела", "action": "approve"},
        {"order": 3, "role_key": "group:accounting@company", "label": "Бухгалтерия", "action": "inform"},
    ]
    resolved = build_approval_steps(steps, author)
    assert [r.approver.pk for r in resolved] == [sector_head.pk, dept_head.pk, accountant.pk]
    assert [r.order for r in resolved] == [1, 2, 3]


@pytest.mark.django_db
def test_build_chain_skips_unresolvable_inform_step(tree):
    sector_head = UserFactory(department_unit=tree["sector_a"], is_department_head=True)
    author = UserFactory(department_unit=tree["sector_a"], company_unit=tree["company"])
    # Нет ни одного бухгалтера → group шаг должен быть скипнут (он inform)
    steps = [
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
        {"order": 2, "role_key": "group:accounting@company", "label": "Бух.", "action": "inform"},
    ]
    resolved = build_approval_steps(steps, author)
    assert len(resolved) == 1
    assert resolved[0].approver.pk == sector_head.pk


@pytest.mark.django_db
def test_build_chain_fails_if_required_step_unresolvable(tree):
    """Обязательный approve-шаг, который не резолвнулся → ResolveError."""
    author = UserFactory(department_unit=tree["sector_a"], company_unit=tree["company"])
    # Нет ни supervisor'а, ни head'ов в цепочке
    steps = [
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
    ]
    with pytest.raises(ResolveError):
        build_approval_steps(steps, author)


@pytest.mark.django_db
def test_build_chain_dedupes_same_approver(tree):
    """Если supervisor и dept_head:parent — один и тот же юзер, второй шаг скипается."""
    dept_head = UserFactory(department_unit=tree["dept1"], is_department_head=True)
    # Автор — сотрудник dept1 напрямую (не sector), supervisor будет dept_head.
    author = UserFactory(department_unit=tree["dept1"])
    steps = [
        {"order": 1, "role_key": "supervisor", "label": "Рук.", "action": "approve"},
        {"order": 2, "role_key": "dept_head:self", "label": "Рук. отдела", "action": "approve"},
    ]
    resolved = build_approval_steps(steps, author)
    # supervisor и dept_head:self оба резолвят в dept_head → оба шага скипают друг друга после первого
    assert len(resolved) == 1
    assert resolved[0].approver.pk == dept_head.pk


@pytest.mark.django_db
def test_build_chain_parallel_group_not_deduped(tree, accounting_group):
    """Шаги в параллельной группе не подлежат дедупу."""
    UserFactory(department_unit=tree["dept1"], is_department_head=True)
    author = UserFactory(department_unit=tree["sector_a"])
    steps = [
        {"order": 1, "role_key": "supervisor", "label": "A", "action": "approve", "parallel_group": "g1"},
        {"order": 2, "role_key": "dept_head:parent", "label": "B", "action": "approve", "parallel_group": "g1"},
    ]
    resolved = build_approval_steps(steps, author)
    # Оба резолвят в boss, но parallel_group не даёт дедупу произойти.
    assert len(resolved) == 2
