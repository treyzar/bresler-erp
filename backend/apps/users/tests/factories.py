import factory
from django.contrib.auth.hashers import make_password

from apps.users.models import Assignment, User


class UserFactory(factory.django.DjangoModelFactory):
    """Базовая фабрика User. Штатка живёт в Assignment — для удобства миграции
    старых тестов фабрика принимает «convenience kwargs»:

    - `company_unit` (OrgUnit) — создаёт primary Assignment с этой компанией
    - `department_unit` (Department) — primary Assignment с этим подразделением
    - `is_department_head` (bool) — флаг is_head на primary
    - `position` (str) — должность primary

    Хоть на User этих полей больше нет, фабрика создаёт соответствующий
    Assignment(is_primary=True) после создания пользователя.
    """

    class Meta:
        model = User
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = factory.Faker("first_name", locale="ru_RU")
    last_name = factory.Faker("last_name", locale="ru_RU")
    patronymic = factory.Faker("middle_name", locale="ru_RU")
    password = factory.LazyFunction(lambda: make_password("testpass123"))
    is_active = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        company = kwargs.pop("company_unit", None)
        department = kwargs.pop("department_unit", None)
        is_head = kwargs.pop("is_department_head", False)
        position = kwargs.pop("position", "")
        # legacy текстовые поля (department, company) — игнорируем без шума
        kwargs.pop("department", None)
        kwargs.pop("company", None)

        user = super()._create(model_class, *args, **kwargs)

        if company is None and department is not None:
            company = department.company
        if company is not None:
            Assignment.objects.create(
                user=user,
                company=company,
                department=department,
                position=position or "",
                is_head=bool(is_head),
                is_primary=True,
                is_active=True,
            )
        return user


class AssignmentFactory(factory.django.DjangoModelFactory):
    """Прямое создание Assignment. По умолчанию НЕ primary — primary
    обычно даёт UserFactory (kwargs company_unit/department_unit).
    """

    class Meta:
        model = Assignment

    is_primary = False
    is_active = True
    is_head = False
    position = ""
