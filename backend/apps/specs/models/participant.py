from django.db import models


class ParticipantContact(models.Model):
    """Контакты участника запроса (per-participant, не per-order)."""

    participant = models.ForeignKey(
        "orders.OrderParticipant",
        on_delete=models.CASCADE,
        related_name="participant_contacts",
        verbose_name="Участник запроса",
    )
    contact = models.ForeignKey(
        "directory.Contact",
        on_delete=models.CASCADE,
        related_name="participant_links",
        verbose_name="Контактное лицо",
    )
    is_primary = models.BooleanField("Основной контакт", default=False)

    class Meta:
        verbose_name = "Контакт участника"
        verbose_name_plural = "Контакты участников"
        constraints = [
            models.UniqueConstraint(
                fields=["participant", "contact"],
                name="unique_participant_contact",
            )
        ]

    def __str__(self):
        return f"{self.participant} — {self.contact}"
