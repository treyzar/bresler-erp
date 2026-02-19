import factory
from django.contrib.auth.hashers import make_password

from apps.users.models import User


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = factory.Faker("first_name", locale="ru_RU")
    last_name = factory.Faker("last_name", locale="ru_RU")
    patronymic = factory.Faker("middle_name", locale="ru_RU")
    password = factory.LazyFunction(lambda: make_password("testpass123"))
    is_active = True
    department = factory.Faker("job", locale="ru_RU")
    position = factory.Faker("job", locale="ru_RU")
