from datetime import date

from django.db.models import Max

# Map group name → letter prefix
GROUP_PREFIX_MAP = {
    "otm": "М",
    "projects": "П",
    "procurement": "С",
    "admin": "А",
}
DEFAULT_PREFIX = "М"


def get_number_prefix(user) -> str:
    """Return the document number prefix letter based on user's primary group."""
    for group in user.groups.all():
        prefix = GROUP_PREFIX_MAP.get(group.name)
        if prefix:
            return prefix
    return DEFAULT_PREFIX


def generate_letter_number(user) -> tuple[str, int]:
    """
    Generate a unique document number and its global sequence number.

    Format: [PREFIX][MM]-[SEQ]
      PREFIX — letter of user's department group (М, П, С, А)
      MM     — current month (auto from today)
      SEQ    — global incrementing sequence (continues across all letters,
               including the numeric parts of imported legacy numbers)

    Returns (number_str, seq_int), e.g. ("М03-25588", 25588)
    """
    import re
    from apps.edo.registry.models import Letter

    prefix = get_number_prefix(user)
    month_str = date.today().strftime("%m")

    # Max from seq field (covers newly created letters)
    max_seq = Letter.objects.aggregate(m=Max("seq"))["m"] or 0

    # Max from the numeric part embedded in legacy number strings (e.g. "М06-25587" → 25587)
    max_from_numbers = 0
    for number_str in Letter.objects.values_list("number", flat=True):
        m = re.search(r"-(\d+)", number_str)
        if m:
            try:
                max_from_numbers = max(max_from_numbers, int(m.group(1)))
            except ValueError:
                pass

    seq = max(max_seq, max_from_numbers) + 1
    number = f"{prefix}{month_str}-{seq}"
    return number, seq


def get_department_user_ids(user) -> set[int]:
    """Return IDs of the current user + all users sharing at least one group with them."""
    user_group_ids = set(user.groups.values_list("id", flat=True))
    if not user_group_ids:
        return {user.id}

    from apps.users.models import User
    colleagues = User.objects.filter(
        is_active=True,
        groups__id__in=user_group_ids,
    ).values_list("id", flat=True)
    return set(colleagues) | {user.id}


def check_department_access(request_user, letter) -> bool:
    """
    Returns True if request_user may see full letter details:
    - superuser
    - letter creator or executor
    - shares a group with the letter creator
    """
    if request_user.is_superuser:
        return True
    if letter.created_by_id == request_user.id or letter.executor_id == request_user.id:
        return True
    creator_group_ids = set(letter.created_by.groups.values_list("id", flat=True))
    user_group_ids = set(request_user.groups.values_list("id", flat=True))
    return bool(creator_group_ids & user_group_ids)
