from apps.core.events import trigger_event
from apps.orders.models import Contract, Order


def get_or_create_contract(order: Order, **kwargs) -> Contract:
    """Get or create a contract for the given order."""
    contract, created = Contract.objects.get_or_create(order=order, defaults=kwargs)
    if created:
        trigger_event("contract.created", instance=contract)
    return contract


def update_contract(order: Order, user=None, **kwargs) -> Contract:
    """Update contract for the given order."""
    contract = Contract.objects.get(order=order)
    old_status = contract.status

    for key, value in kwargs.items():
        setattr(contract, key, value)
    contract.save()

    if "status" in kwargs and old_status != contract.status:
        trigger_event(
            "contract.payment_changed",
            instance=contract,
            user=user,
            old_status=old_status,
            new_status=contract.status,
        )
    return contract
