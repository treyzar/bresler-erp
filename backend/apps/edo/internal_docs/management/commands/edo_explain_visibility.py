"""Диагностика: почему пользователь X видит/не видит документ Y.

Использование:
    manage.py edo_explain_visibility --doc 42 --user 17

Печатает все условия из Document.objects.for_user / inbox_for, по каждому
показывает результат и финальный вердикт. Полезно при тикетах вида
«у бухгалтерии не появилось в инбоксе»."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.edo.internal_docs.models import (
    ApprovalStep,
    Document,
    InternalDocFlowConfig,
)


class Command(BaseCommand):
    help = "Объясняет, почему юзер видит / не видит конкретный документ ЭДО"

    def add_arguments(self, parser):
        parser.add_argument("--doc", type=int, required=True, help="Document.pk")
        parser.add_argument("--user", type=int, required=True, help="User.pk")

    def handle(self, *args, **opts):
        User = get_user_model()
        try:
            doc = Document.objects.select_related("type", "author").get(pk=opts["doc"])
        except Document.DoesNotExist as e:
            raise CommandError(f"Document {opts['doc']} не существует") from e
        try:
            user = User.objects.get(pk=opts["user"])
        except User.DoesNotExist as e:
            raise CommandError(f"User {opts['user']} не существует") from e

        config = InternalDocFlowConfig.get_solo()
        groups = list(user.groups.values_list("name", flat=True))

        # Шапка.
        out = self.stdout
        ok = self.style.SUCCESS
        bad = self.style.ERROR
        warn = self.style.WARNING

        out.write("")
        out.write(self.style.HTTP_INFO(f"=== Document {doc.pk}: {doc.number or '(draft)'} «{doc.title}» ==="))
        out.write(f"  Type:           {doc.type.name} ({doc.type.code})")
        out.write(f"  Visibility:     {doc.type.visibility}")
        out.write(f"  Tenancy override: {doc.type.tenancy_override or '(нет)'}")
        out.write(f"  Status:         {doc.status}")
        out.write(f"  Author:         {doc.author.get_full_name() or doc.author.username} (id={doc.author_id})")
        out.write(
            f"  author_company_unit: {doc.author_company_unit_id} "
            f"({doc.author_company_unit.name if doc.author_company_unit_id else '—'})"
        )
        out.write(
            f"  author_department_unit: {doc.author_department_unit_id} "
            f"({doc.author_department_unit.name if doc.author_department_unit_id else '—'})"
        )
        out.write(f"  current_step:   {doc.current_step_id}")

        out.write("")
        out.write(self.style.HTTP_INFO(f"=== User {user.pk}: {user.get_full_name() or user.username} ==="))
        out.write(f"  is_superuser:        {user.is_superuser}")
        out.write(f"  is_active:           {user.is_active}")
        out.write(f"  is_department_head:  {user.is_department_head}")
        out.write(f"  groups:              {groups}")
        out.write(
            f"  company_unit:        {user.company_unit_id} ({user.company_unit.name if user.company_unit_id else '—'})"
        )
        out.write(
            f"  department_unit:     {user.department_unit_id} "
            f"({user.department_unit.name if user.department_unit_id else '—'})"
        )

        out.write("")
        out.write(self.style.HTTP_INFO("=== Шаги документа ==="))
        for s in doc.steps.order_by("order").select_related("approver"):
            approver = s.approver.get_full_name() if s.approver_id else "—"
            out.write(
                f"  #{s.order} [{s.status}] role={s.role_key} "
                f"action={s.action} approver={approver} (id={s.approver_id})"
            )

        # Проверки видимости (for_user).
        out.write("")
        out.write(self.style.HTTP_INFO("=== Видимость (for_user) ==="))

        if user.is_superuser or "admin" in groups:
            out.write(ok("✓ Видит — superuser или группа admin"))
            return

        seen_via: list[str] = []
        if doc.author_id == user.pk:
            seen_via.append("автор документа")
        if doc.steps.filter(approver=user).exists():
            seen_via.append("активный согласующий (steps__approver=user)")
        if doc.steps.filter(original_approver=user).exists():
            seen_via.append("делегирован → original_approver=user")
        for g in groups:
            if doc.steps.filter(role_key=f"group:{g}").exists():
                seen_via.append(f"member группы '{g}' в group-шаге без скоупа")
            if user.company_unit_id and doc.steps.filter(role_key=f"group:{g}@company").exists():
                if doc.author_company_unit_id == user.company_unit_id:
                    seen_via.append(f"member группы '{g}' + author и user в одной компании")
                else:
                    out.write(
                        warn(
                            f"  — group:{g}@company есть в шагах, но "
                            f"author_company_unit={doc.author_company_unit_id} ≠ "
                            f"user.company_unit={user.company_unit_id}, не учитывается"
                        )
                    )

        if user.is_department_head and user.department_unit_id:
            from apps.directory.models import Department

            subtree = list(Department.get_tree(user.department_unit).values_list("pk", flat=True))
            if doc.author_department_unit_id in subtree:
                seen_via.append(
                    f"is_department_head, author_department_unit в поддереве вашего dept ({user.department_unit.name})"
                )

        if (
            doc.type.visibility == "department_visible"
            and doc.author_department_unit_id == user.department_unit_id
        ):
            seen_via.append("type=department_visible + одно подразделение с автором")
        if doc.type.visibility == "public":
            seen_via.append("type=public (учитывается tenant-фильтром ниже)")

        if not seen_via:
            out.write(bad("✗ Документ невидим: ни одно из правил for_user не сработало."))
        else:
            for r in seen_via:
                out.write(ok(f"  ✓ {r}"))

        # Tenancy фильтр.
        out.write("")
        out.write(self.style.HTTP_INFO("=== Multi-tenant фильтр ==="))
        out.write(f"  scope: {config.cross_company_scope}")
        if config.cross_company_scope == "company_only":
            if doc.type.tenancy_override == "group_wide":
                out.write(ok("  ✓ tenancy_override=group_wide — пробивает company_only"))
            elif doc.author_company_unit_id == user.company_unit_id:
                out.write(ok("  ✓ author и user в одной компании"))
            elif doc.author_id == user.pk:
                out.write(ok("  ✓ user — автор документа"))
            elif doc.steps.filter(approver=user).exists():
                out.write(ok("  ✓ user — назначенный approver"))
            else:
                out.write(bad("  ✗ Tenant-фильтр блокирует: разные компании, нет override, не автор, не approver"))

        # Inbox-проверка отдельно.
        out.write("")
        out.write(self.style.HTTP_INFO("=== Inbox (inbox_for) ==="))
        if doc.status != "pending":
            out.write(warn(f"  Документ status={doc.status}, в inbox быть не может"))
        else:
            pending_active = list(
                doc.steps.filter(
                    status=ApprovalStep.Status.PENDING,
                    action__in=(ApprovalStep.Action.APPROVE, ApprovalStep.Action.SIGN),
                ).order_by("order")
            )
            if not pending_active:
                out.write(warn("  Нет активных pending-шагов (всё в waiting?)"))
            for s in pending_active:
                if s.approver_id == user.pk:
                    out.write(ok(f"  ✓ Шаг #{s.order} назначен персонально вам"))
                elif s.role_key.startswith("group:"):
                    name, _, scope = s.role_key[len("group:") :].partition("@")
                    if name not in groups:
                        out.write(warn(f"  Шаг #{s.order} group:{name} — вы не в группе"))
                        continue
                    if scope == "company":
                        if not user.company_unit_id:
                            out.write(bad(f"  ✗ Шаг #{s.order} group:{name}@company — у вас не задан company_unit"))
                            continue
                        if doc.author_company_unit_id != user.company_unit_id:
                            out.write(
                                bad(
                                    f"  ✗ Шаг #{s.order} group:{name}@company — "
                                    f"author_company_unit ({doc.author_company_unit_id}) "
                                    f"≠ user.company_unit ({user.company_unit_id})"
                                )
                            )
                            continue
                    out.write(ok(f"  ✓ Шаг #{s.order} group:{s.role_key} — вы в группе и tenant совпадает"))

        out.write("")
