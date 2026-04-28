"""Тесты валидатора `field_schema` (services/schema.py)."""

import pytest
from django.core.exceptions import ValidationError

from apps.edo.internal_docs.services.schema import validate_field_schema


def test_empty_schema_ok():
    validate_field_schema([])
    validate_field_schema(None)


def test_minimal_valid_schema():
    validate_field_schema([{"name": "subject", "type": "text"}])


def test_full_valid_schema():
    validate_field_schema(
        [
            {
                "name": "subject",
                "label": "Тема",
                "type": "text",
                "required": True,
                "placeholder": "Кратко",
                "help_text": "Не более 80 символов",
            },
            {"name": "kind", "type": "choice", "choices": [["a", "A"], ["b", "B"]]},
            {"name": "responsible", "type": "user", "filter": {"is_department_head": True}},
        ]
    )


def test_not_a_list():
    with pytest.raises(ValidationError):
        validate_field_schema({"foo": "bar"})


def test_item_not_a_dict():
    with pytest.raises(ValidationError):
        validate_field_schema(["just a string"])


def test_missing_name():
    with pytest.raises(ValidationError):
        validate_field_schema([{"type": "text"}])


def test_invalid_identifier():
    with pytest.raises(ValidationError):
        validate_field_schema([{"name": "with space", "type": "text"}])


def test_duplicate_name():
    with pytest.raises(ValidationError):
        validate_field_schema(
            [
                {"name": "x", "type": "text"},
                {"name": "x", "type": "number"},
            ]
        )


def test_unknown_type():
    with pytest.raises(ValidationError):
        validate_field_schema([{"name": "x", "type": "rich_html"}])


def test_unknown_key():
    with pytest.raises(ValidationError):
        validate_field_schema([{"name": "x", "type": "text", "weight": 7}])


def test_required_must_be_bool():
    with pytest.raises(ValidationError):
        validate_field_schema([{"name": "x", "type": "text", "required": "yes"}])


def test_choice_requires_choices():
    with pytest.raises(ValidationError):
        validate_field_schema([{"name": "kind", "type": "choice"}])
    with pytest.raises(ValidationError):
        validate_field_schema([{"name": "kind", "type": "choice", "choices": []}])


def test_choices_only_for_choice_type():
    with pytest.raises(ValidationError):
        validate_field_schema(
            [
                {"name": "x", "type": "text", "choices": [["a", "A"]]},
            ]
        )


def test_choice_pair_shape():
    with pytest.raises(ValidationError):
        validate_field_schema(
            [
                {"name": "k", "type": "choice", "choices": [["only_code"]]},
            ]
        )
    with pytest.raises(ValidationError):
        validate_field_schema(
            [
                {"name": "k", "type": "choice", "choices": [[1, "label"]]},
            ]
        )


def test_filter_must_be_dict():
    with pytest.raises(ValidationError):
        validate_field_schema([{"name": "u", "type": "user", "filter": "scope=all"}])


def test_label_must_be_string():
    with pytest.raises(ValidationError):
        validate_field_schema([{"name": "x", "type": "text", "label": 42}])


@pytest.mark.django_db
def test_model_full_clean_runs_validator():
    """Сохранение DocumentType через ModelForm/full_clean ловит невалидную схему."""
    from apps.core.naming import NumberSequence
    from apps.edo.internal_docs.models import ApprovalChainTemplate, DocumentType

    seq = NumberSequence.objects.create(name="t", prefix="T", pattern="{prefix}-{####}")
    chain = ApprovalChainTemplate.objects.create(name="c", steps=[])
    dt = DocumentType(
        code="bad_type",
        name="Bad",
        category="memo",
        field_schema=[{"name": "x", "type": "no_such_type"}],
        numbering_sequence=seq,
        default_chain=chain,
    )
    with pytest.raises(ValidationError):
        dt.full_clean()
