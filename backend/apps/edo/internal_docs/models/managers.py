"""QuerySet + Manager для Document: правило видимости `for_user` по §5 + §3.5.

Семантика после Assignment-рефакторинга: пользователь может иметь несколько
штатных позиций (`Assignment`) в разных подразделениях/компаниях. Видимость
документа считается по ВСЕМ его assignment'ам — например, человек, который
числится в двух компаниях, видит документы обеих; руководитель двух разных
отделов видит документы обоих поддеревьев.
"""

from __future__ import annotations

from django.db import models
from django.db.models import Q


class DocumentQuerySet(models.QuerySet):
    def for_user(self, user) -> DocumentQuerySet:
        """Документы, видимые конкретному пользователю.

        Правила:
        - superuser / группа admin → все
        - автор видит свои
        - согласующий (в цепочке) видит тот документ, где он участник
        - руководитель отдела (Assignment.is_head=True) видит документы
          сотрудников этого отдела и его поддерева
        - руководитель company-уровня (is_head=True + department=NULL) видит
          всё в этой компании
        - `DocumentType.visibility='department_visible'` — видят все сотрудники
          того же department (любой assignment) автора
        - `DocumentType.visibility='public'` — зависит от tenant-режима
        - Multi-tenant фильтр применяется поверх всех правил, кроме админа.

        Индексы, на которые опирается этот запрос (см. Document.Meta.indexes):
            (author, status), (author_company_unit, status),
            (author_department_unit), (type, status),
            (approver, status), (original_approver), (status, role_key) на ApprovalStep.
        """
        if user is None or not user.is_authenticated:
            return self.none()
        if user.is_superuser or user.groups.filter(name="admin").exists():
            return self

        from apps.directory.models import Department

        from .config import InternalDocFlowConfig
        from .document_type import DocumentType

        # Собираем «контексты» пользователя из всех его активных assignment'ов.
        active_assignments = list(
            user.assignments.filter(is_active=True).values_list(
                "company_id", "department_id", "is_head",
            ),
        )
        user_company_ids: set[int] = {a[0] for a in active_assignments if a[0]}
        user_dept_ids: set[int] = {a[1] for a in active_assignments if a[1]}
        head_dept_ids: list[int] = [a[1] for a in active_assignments if a[2] and a[1]]
        head_company_only_ids: set[int] = {a[0] for a in active_assignments if a[2] and not a[1]}

        # Поддерево всех department, в которых user — head.
        head_subtree_ids: set[int] = set()
        if head_dept_ids:
            for dept in Department.objects.filter(pk__in=head_dept_ids):
                head_subtree_ids.update(Department.get_tree(dept).values_list("pk", flat=True))

        # Базовые условия: автор или участник цепочки.
        conditions = Q(author=user) | Q(steps__approver=user) | Q(steps__original_approver=user)

        # Если в шаге role_key=group:<NAME>[@company] и user в этой группе —
        # видит документ как участник коллективного шага.
        for g_name in user.groups.values_list("name", flat=True):
            conditions |= Q(steps__role_key=f"group:{g_name}")
            if user_company_ids:
                conditions |= Q(
                    steps__role_key=f"group:{g_name}@company",
                    author_company_unit_id__in=user_company_ids,
                )

        # Руководитель видит документы своего department и поддерева.
        if head_subtree_ids:
            conditions |= Q(author_department_unit_id__in=head_subtree_ids)
        if head_company_only_ids:
            conditions |= Q(author_company_unit_id__in=head_company_only_ids)

        # department_visible: сотрудники того же department (любой assignment).
        if user_dept_ids:
            conditions |= Q(
                type__visibility=DocumentType.Visibility.DEPARTMENT_VISIBLE,
                author_department_unit_id__in=user_dept_ids,
            )

        # public: зависит от tenancy.
        conditions |= Q(type__visibility=DocumentType.Visibility.PUBLIC)

        qs = self.filter(conditions).distinct()

        # Применяем multi-tenant scope для public (кроме override).
        config = InternalDocFlowConfig.get_solo()
        if config.cross_company_scope == InternalDocFlowConfig.TenancyScope.COMPANY_ONLY:
            # company_only: публичные документы чужой компании скрываем,
            # если у DocumentType не стоит tenancy_override='group_wide'.
            if user_company_ids:
                tenant_q = (
                    Q(author_company_unit_id__in=user_company_ids)
                    | Q(type__tenancy_override=DocumentType.TenancyOverride.GROUP_WIDE)
                    | Q(author=user)
                    | Q(steps__approver=user)
                )
                qs = qs.filter(tenant_q).distinct()
            else:
                qs = qs.filter(Q(author=user) | Q(steps__approver=user)).distinct()

        return qs

    def inbox_for(self, user) -> DocumentQuerySet:
        """Документы, ожидающие решения от `user`.

        Включает:
        - персональный inbox: PENDING active-шаг с `approver=user`;
        - групповой inbox: PENDING active-шаг с `role_key='group:NAME[@company]'`
          и user в группе NAME; для @company — author_company должен быть
          среди assignment-компаний user'а.
        """
        active_actions = ["approve", "sign"]
        direct_q = Q(
            steps__status="pending",
            steps__action__in=active_actions,
            steps__approver=user,
        )

        user_groups = set(user.groups.values_list("name", flat=True))
        user_company_ids = set(
            user.assignments.filter(is_active=True).values_list("company_id", flat=True),
        )
        group_q = Q()
        for g in user_groups:
            group_q |= Q(
                steps__status="pending",
                steps__action__in=active_actions,
                steps__role_key=f"group:{g}",
            )
            if user_company_ids:
                group_q |= Q(
                    steps__status="pending",
                    steps__action__in=active_actions,
                    steps__role_key=f"group:{g}@company",
                    author_company_unit_id__in=user_company_ids,
                )

        return self.filter(Q(status="pending") & (direct_q | group_q)).distinct()

    def drafts_of(self, user) -> DocumentQuerySet:
        return self.filter(author=user, status__in=["draft", "revision_requested"])

    def authored_by(self, user) -> DocumentQuerySet:
        return self.filter(author=user)


def _descendant_department_ids(department) -> list[int]:
    """Возвращает id всего поддерева department, включая его самого."""
    from apps.directory.models import Department

    subtree = Department.get_tree(department)
    return list(subtree.values_list("pk", flat=True))


DocumentManager = models.Manager.from_queryset(DocumentQuerySet)
