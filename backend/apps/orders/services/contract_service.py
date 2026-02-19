from apps.orders.models import Contract, Order


def get_or_create_contract(order: Order, **kwargs) -> Contract:
    """Get or create a contract for the given order."""
    contract, _ = Contract.objects.get_or_create(order=order, defaults=kwargs)
    return contract


def update_contract(order: Order, **kwargs) -> Contract:
    """Update contract for the given order."""
    contract = Contract.objects.get(order=order)
    for key, value in kwargs.items():
        setattr(contract, key, value)
    contract.save()
    return contract
