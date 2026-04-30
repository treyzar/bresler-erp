"""Сигналы пользователей.

Прежний sync_legacy_department_company удалён вместе с flat-полями
User.{department, company, company_unit, department_unit, position, is_department_head}.
Источник истины — модель `Assignment`. Файл оставлен пустым, чтобы apps.ready()
не сломался; добавлять сюда сигналы по мере необходимости.
"""
