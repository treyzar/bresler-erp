from apps.directory.models import OrgUnit


def get_tree():
    """Get full org unit tree starting from root nodes."""
    return OrgUnit.get_root_nodes()


def get_children(node_id: int):
    """Get children of an org unit."""
    node = OrgUnit.objects.get(pk=node_id)
    return node.get_children()


def get_ancestors(node_id: int):
    """Get ancestors of an org unit (for breadcrumbs)."""
    node = OrgUnit.objects.get(pk=node_id)
    return node.get_ancestors()


def move_node(node_id: int, target_id: int, position: str = "sorted-child"):
    """Move an org unit to a new parent."""
    node = OrgUnit.objects.get(pk=node_id)
    target = OrgUnit.objects.get(pk=target_id)
    node.move(target, position)


def add_root_node(**kwargs) -> OrgUnit:
    """Add a root-level org unit."""
    return OrgUnit.add_root(**kwargs)


def add_child_node(parent_id: int, **kwargs) -> OrgUnit:
    """Add a child org unit."""
    parent = OrgUnit.objects.get(pk=parent_id)
    return parent.add_child(**kwargs)
