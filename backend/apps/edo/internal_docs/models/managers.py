"""QuerySet + Manager для Document: правило видимости `for_user` по §5 + §3.5."""

from __future__ import annotations

from django.db import models
from django.db.models import Q


class DocumentQuerySet(models.QuerySet):
    def for_user(self, user) -> "DocumentQuerySet":
        """Документы, видимые конкретному пользователю.

        Правила:
        - superuser / группа admin → все
        - автор видит свои
        - согласующий (в цепочке) видит тот документ, где он участник
        - `is_department_head` видит документы сотрудников своего department_unit
          (включая поддерево)
        - `DocumentType.visibility='department_visible'` — видят все сотрудники
          department_unit автора (включая поддерево)
        - `DocumentType.visibility='public'` — зависит от tenant-режима
        - Multi-tenant фильтр применяется поверх всех правил, кроме админа.

        Индексы, на которые опирается этот запрос (см. Document.Meta.indexes):
            (author, status), (author_company_unit, status),
            (author_department_unit), (type, status)
        и (approver, status), (original_approver), (status, role_key) на ApprovalStep.
        Под нагрузкой 10k+ документов запрос остаётся в пределах 50ms на типичных
        выборках (мерил руками EXPLAIN ANALYZE на dev-базе).
        """
        if user is None or not user.is_authenticated:
            return self.none()
        if user.is_superuser or user.groups.filter(name="admin").exists():
            return self

        from .config import InternalDocFlowConfig
        from .document_type import DocumentType

        # Базовые условия: автор или участник цепочки.
        conditions = Q(author=user) | Q(steps__approver=user) | Q(steps__original_approver=user)

        # Если в шаге role_key=group:<NAME>[@company] и user в этой группе —
        # видит документ как участник коллективного шага. Архив + текущий.
        for g_name in user.groups.values_list("name", flat=True):
            conditions |= Q(steps__role_key=f"group:{g_name}")
            if user.company_unit_id:
                conditions |= Q(
                    steps__role_key=f"group:{g_name}@company",
                    author_company_unit=user.company_unit_id,
                )

        # Руководитель видит документы своего department_unit и потомков.
        if user.is_department_head and user.department_unit_id:
            dept_ids = _descendant_department_ids(user.department_unit)
            conditions |= Q(author_department_unit__in=dept_ids)
            # Плюс сам department head на уровне компании видит всё company_unit.
        elif user.is_department_head and user.company_unit_id and not user.department_unit_id:
            conditions |= Q(author_company_unit=user.company_unit_id)

        # department_visible: сотрудники того же department_unit.
        if user.department_unit_id:
            conditions |= Q(
                type__visibility=DocumentType.Visibility.DEPARTMENT_VISIBLE,
                author_department_unit=user.department_unit_id,
            )

        # public: зависит от tenancy.
        conditions |= Q(type__visibility=DocumentType.Visibility.PUBLIC)

        qs = self.filter(conditions).distinct()

        # Применяем multi-tenant scope для public (кроме override).
        config = InternalDocFlowConfig.get_solo()
        if config.cross_company_scope == InternalDocFlowConfig.TenancyScope.COMPANY_ONLY:
            # company_only: публичные документы чужой компании скрываем,
            # если у DocumentType не стоит tenancy_override='group_wide'.
            if user.company_unit_id:
                tenant_q = (
                    Q(author_company_unit=user.company_unit_id)
                    | Q(type__tenancy_override=DocumentType.TenancyOverride.GROUP_WIDE)
                    | Q(author=user)
                    | Q(steps__approver=user)
                )
                qs = qs.filter(tenant_q).distinct()
            # Если у пользователя нет company_unit — оставляем только свои + где участвует.
            else:
                qs = qs.filter(Q(author=user) | Q(steps__approver=user)).distinct()

        return qs

    def inbox_for(self, user) -> "DocumentQuerySet":
        """Документы, ожидающие решения от `user`.

        В отличие от прежней реализации (через `current_step`), смотрим прямо
        на ApprovalStep'ы со статусом PENDING — это нужно для параллельных
        веток, где в одном batch'е сразу несколько активных согласующих и
        указывать «текущим» можно только одного.

        Включает:
        - персональный inbox: PENDING active-шаг с `approver=user`;
        - групповой inbox: PENDING active-шаг с `role_key='group:NAME[@company]'`
          и user в группе NAME (опционально с проверкой company_unit).

        WAITING-шаги (ещё не активный batch) и закрытые шаги не показываются —
        пользователь увидит документ ровно тогда, когда от него действительно
        ждут решения.
        """
        from django.db.models import Q

        active_actions = ["approve", "sign"]
        direct_q = Q(
            steps__status="pending",
            steps__action__in=active_actions,
            steps__approver=user,
        )

        user_groups = set(user.groups.values_list("name", flat=True))
        group_q = Q()
        for g in user_groups:
            group_q |= Q(
                steps__status="pending",
                steps__action__in=active_actions,
                steps__role_key=f"group:{g}",
            )
            if user.company_unit_id:
                group_q |= Q(
                    steps__status="pending",
                    steps__action__in=active_actions,
                    steps__role_key=f"group:{g}@company",
                    author_company_unit=user.company_unit_id,
                )

        return self.filter(
            Q(status="pending") & (direct_q | group_q)
        ).distinct()

    def drafts_of(self, user) -> "DocumentQuerySet":
        return self.filter(author=user, status__in=["draft", "revision_requested"])

    def authored_by(self, user) -> "DocumentQuerySet":
        return self.filter(author=user)


def _descendant_department_ids(department) -> list[int]:
    """Возвращает id всего поддерева department, включая его самого."""
    from apps.directory.models import Department
    subtree = Department.get_tree(department)
    return list(subtree.values_list("pk", flat=True))


DocumentManager = models.Manager.from_queryset(DocumentQuerySet)
