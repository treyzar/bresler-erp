import pytest

from apps.users.models import User

from .factories import UserFactory


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = UserFactory()
        assert user.pk is not None
        assert user.is_active is True

    def test_get_full_name(self):
        user = UserFactory(
            last_name="Иванов",
            first_name="Иван",
            patronymic="Иванович",
        )
        assert user.get_full_name() == "Иванов Иван Иванович"

    def test_get_full_name_without_patronymic(self):
        user = UserFactory(
            last_name="Иванов",
            first_name="Иван",
            patronymic="",
        )
        assert user.get_full_name() == "Иванов Иван"

    def test_str_returns_full_name(self):
        user = UserFactory(
            last_name="Иванов",
            first_name="Иван",
            patronymic="Иванович",
        )
        assert str(user) == "Иванов Иван Иванович"

    def test_str_fallback_to_username(self):
        user = UserFactory(
            username="testuser",
            first_name="",
            last_name="",
            patronymic="",
        )
        assert str(user) == "testuser"

    def test_user_ordering(self):
        user_b = UserFactory(last_name="Борисов", first_name="Борис")
        user_a = UserFactory(last_name="Алексеев", first_name="Алексей")
        users = list(User.objects.all())
        assert users[0] == user_a
        assert users[1] == user_b
