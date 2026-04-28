from django.db import models
from treebeard.mp_tree import MP_Node


class Parameter(MP_Node):
    """
    Древовидная структура параметров устройств РЗА.

    Типы параметров:
    - select: выбор из предопределённого списка значений
    - custom: пользовательское значение (произвольный ввод)
    - composite: составной параметр с подполями
    """

    PARAMETER_TYPES = [
        ("select", "Выбор из списка"),
        ("custom", "Пользовательское значение"),
        ("composite", "Составной параметр"),
    ]

    name = models.CharField(max_length=350, verbose_name="Название")
    parameter_type = models.CharField(
        max_length=20,
        choices=PARAMETER_TYPES,
        default="select",
        verbose_name="Тип параметра",
    )
    _is_leaf = models.BooleanField(default=True, db_column="is_leaf", verbose_name="Листовой элемент")
    can_add_multiple = models.BooleanField(default=False, verbose_name="Можно добавлять несколько")
    comment = models.TextField(blank=True, default="", verbose_name="Примечание")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")

    node_order_by = ["name"]

    class Meta:
        ordering = ["id"]
        verbose_name = "Параметр"
        verbose_name_plural = "Параметры"

    def __str__(self):
        return self.name

    def is_leaf(self):
        return self._is_leaf

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if not is_new:
            has_children = self.get_children().exists()
            if self._is_leaf == has_children:
                Parameter.objects.filter(pk=self.pk).update(_is_leaf=not has_children)
                self._is_leaf = not has_children

    def add_child(self, **kwargs):
        child = super().add_child(**kwargs)
        if self._is_leaf:
            Parameter.objects.filter(pk=self.pk).update(_is_leaf=False)
            self._is_leaf = False
        return child


class ParameterValue(models.Model):
    """Значение параметра (для типа select)."""

    parameter = models.ForeignKey(
        Parameter,
        on_delete=models.CASCADE,
        related_name="values",
        verbose_name="Параметр",
    )
    value = models.CharField(max_length=350, verbose_name="Значение")
    is_custom_value = models.BooleanField(default=False, verbose_name="Пользовательское значение")

    class Meta:
        ordering = ["id"]
        verbose_name = "Значение параметра"
        verbose_name_plural = "Значения параметров"

    def __str__(self):
        return f"{self.parameter.name}: {self.value}"


class CompositeParameterTemplate(models.Model):
    """Шаблон составного параметра."""

    parameter = models.ForeignKey(
        Parameter,
        on_delete=models.CASCADE,
        related_name="composite_templates",
        verbose_name="Составной параметр",
    )
    name = models.CharField(max_length=350, verbose_name="Название шаблона")

    class Meta:
        verbose_name = "Шаблон составного параметра"
        verbose_name_plural = "Шаблоны составных параметров"

    def __str__(self):
        return f"{self.parameter.name}: {self.name}"


class CompositeParameterField(models.Model):
    """Поле составного параметра."""

    FIELD_TYPES = [
        ("text", "Текстовое поле"),
        ("number", "Числовое поле"),
        ("select", "Выбор из списка"),
    ]

    composite_parameter = models.ForeignKey(
        Parameter,
        on_delete=models.CASCADE,
        related_name="composite_fields",
        verbose_name="Составной параметр",
    )
    name = models.CharField(max_length=350, verbose_name="Название поля")
    field_type = models.CharField(
        max_length=20,
        choices=FIELD_TYPES,
        default="text",
        verbose_name="Тип поля",
    )
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок отображения")
    select_parameter = models.ForeignKey(
        Parameter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="used_in_composite_fields",
        verbose_name="Параметр для выбора значений",
        help_text='Только для полей типа "Выбор из списка"',
    )

    class Meta:
        ordering = ["order"]
        verbose_name = "Поле составного параметра"
        verbose_name_plural = "Поля составных параметров"

    def __str__(self):
        return f"{self.composite_parameter.name}: {self.name}"
