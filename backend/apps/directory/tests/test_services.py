import pytest

from apps.directory.models import Equipment, OrgUnit
from apps.directory.services.directory_service import bulk_delete
from apps.directory.services.orgunit_service import (
    add_child_node,
    add_root_node,
    get_ancestors,
    get_children,
    get_tree,
    move_node,
)

from .factories import EquipmentFactory, OrgUnitFactory


@pytest.mark.django_db
class TestOrgUnitService:
    def test_get_tree(self):
        OrgUnitFactory(name="Root 1")
        OrgUnitFactory(name="Root 2")
        roots = get_tree()
        assert roots.count() == 2

    def test_get_children(self):
        root = OrgUnitFactory(name="Root")
        OrgUnitFactory(name="Child 1", parent=root)
        OrgUnitFactory(name="Child 2", parent=root)
        children = get_children(root.pk)
        assert children.count() == 2

    def test_get_ancestors(self):
        root = OrgUnitFactory(name="Root")
        child = OrgUnitFactory(name="Child", parent=root)
        grandchild = OrgUnitFactory(name="Grandchild", parent=child)
        ancestors = get_ancestors(grandchild.pk)
        assert ancestors.count() == 2

    def test_add_root_node(self):
        node = add_root_node(name="New Root")
        assert node.pk is not None
        assert node.depth == 1

    def test_add_child_node(self):
        root = OrgUnitFactory(name="Root")
        child = add_child_node(root.pk, name="New Child")
        assert child.pk is not None
        assert child.depth == 2

    def test_move_node(self):
        root1 = OrgUnitFactory(name="Root 1")
        root2 = OrgUnitFactory(name="Root 2")
        child = OrgUnitFactory(name="Child", parent=root1)
        move_node(child.pk, root2.pk, "sorted-child")
        child.refresh_from_db()
        assert child.depth == 2
        root2.refresh_from_db()
        root2_children = root2.get_children()
        assert child.pk in list(root2_children.values_list("pk", flat=True))

    def test_get_children_nonexistent_node(self):
        with pytest.raises(OrgUnit.DoesNotExist):
            get_children(99999)

    def test_get_ancestors_nonexistent_node(self):
        with pytest.raises(OrgUnit.DoesNotExist):
            get_ancestors(99999)


@pytest.mark.django_db
class TestDirectoryService:
    def test_bulk_delete(self):
        e1 = EquipmentFactory()
        e2 = EquipmentFactory()
        deleted = bulk_delete(Equipment, [e1.pk, e2.pk])
        assert deleted == 2
        assert Equipment.objects.count() == 0

    def test_bulk_delete_empty_list(self):
        EquipmentFactory()
        deleted = bulk_delete(Equipment, [])
        assert deleted == 0
        assert Equipment.objects.count() == 1

    def test_bulk_delete_nonexistent_ids(self):
        deleted = bulk_delete(Equipment, [99999, 99998])
        assert deleted == 0
