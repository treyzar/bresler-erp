class TransitionNotAllowed(Exception):
    """Raised when a status transition is not in the allowed transitions list."""

    def __init__(self, from_status, to_status, message=None):
        self.from_status = from_status
        self.to_status = to_status
        self.message = message or f"Переход '{from_status}' → '{to_status}' не разрешён"
        super().__init__(self.message)


class ConditionNotMet(Exception):
    """Raised when a transition condition is not satisfied."""

    def __init__(self, condition_message):
        self.message = condition_message
        super().__init__(self.message)
