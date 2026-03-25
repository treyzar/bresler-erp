from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()

# RZA
router.register("voltage-classes", views.VoltageClassViewSet, basename="voltage-class")
router.register("rza", views.DeviceRZAViewSet, basename="device-rza")
router.register("modifications", views.ModRZAViewSet, basename="mod-rza")

# Parameters
router.register("parameters", views.ParameterViewSet, basename="parameter")
router.register("parameter-values", views.ParameterValueViewSet, basename="parameter-value")
router.register(
    "composite-templates",
    views.CompositeParameterTemplateViewSet,
    basename="composite-template",
)
router.register(
    "composite-fields",
    views.CompositeParameterFieldViewSet,
    basename="composite-field",
)

# Components
router.register("component-types", views.ComponentTypeViewSet, basename="component-type")
router.register("components", views.DeviceComponentViewSet, basename="device-component")
router.register("component-visuals", views.ComponentVisualViewSet, basename="component-visual")
router.register("terminal-layouts", views.TerminalLayoutViewSet, basename="terminal-layout")

# Catalog
router.register("categories", views.ProductCategoryViewSet, basename="product-category")
router.register("product-types", views.ProductTypeViewSet, basename="product-type")
router.register("products", views.ProductViewSet, basename="product")
router.register("rza-specs", views.RZASpecViewSet, basename="rza-spec")
router.register("catalog-placements", views.CatalogPlacementViewSet, basename="catalog-placement")
router.register("product-attributes", views.ProductAttributeViewSet, basename="product-attribute")
router.register(
    "product-attribute-options",
    views.ProductAttributeOptionViewSet,
    basename="product-attribute-option",
)
router.register("typical-schemes", views.TypicalSchemeViewSet, basename="typical-scheme")

urlpatterns = [
    path("", include(router.urls)),
]
