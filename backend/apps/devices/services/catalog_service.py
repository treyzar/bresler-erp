"""Service layer for Product catalog operations."""

from django.db.models import Q, QuerySet

from apps.devices.models import (
    Product,
    ProductCategory,
)


class CatalogService:
    """Business logic for product catalog management."""

    @staticmethod
    def get_category_tree():
        """Get full category tree as annotated nodes."""
        return ProductCategory.get_annotated_list()

    @staticmethod
    def get_root_categories():
        return ProductCategory.get_root_nodes().filter(is_active=True)

    @staticmethod
    def get_category_children(category_id: int):
        try:
            node = ProductCategory.objects.get(pk=category_id)
        except ProductCategory.DoesNotExist:
            return ProductCategory.objects.none()
        return node.get_children().filter(is_active=True)

    @staticmethod
    def get_products_in_category(category_id: int) -> QuerySet[Product]:
        return Product.objects.filter(
            catalog_placements__category_id=category_id,
            is_active=True,
        ).select_related("product_type")

    @staticmethod
    def search_products(search: str) -> QuerySet[Product]:
        if not search:
            return Product.objects.none()
        return (
            Product.objects.filter(Q(name__icontains=search) | Q(internal_code__icontains=search))
            .filter(is_active=True)
            .select_related("product_type")
        )

    @staticmethod
    def search_categories(search: str) -> QuerySet[ProductCategory]:
        if not search:
            return ProductCategory.objects.none()
        return ProductCategory.objects.filter(Q(name__icontains=search) | Q(short_name__icontains=search)).filter(
            is_active=True
        )
