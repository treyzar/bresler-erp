from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.devices.models import (
    CatalogPlacement,
    ComponentType,
    ComponentVisual,
    CompositeParameterField,
    CompositeParameterTemplate,
    DeviceComponent,
    DeviceRZA,
    DeviceRZAComponent,
    DeviceRZAParameter,
    ModRZA,
    ModRZAComponent,
    ModRZAParameter,
    Parameter,
    ParameterValue,
    Product,
    ProductAttribute,
    ProductAttributeOption,
    ProductAttributeValue,
    ProductBOMLine,
    ProductCategory,
    ProductType,
    RZASpec,
    TerminalLayout,
    TypicalScheme,
    VoltageClass,
)
from apps.devices.services.device_service import DeviceService

from .filters import (
    DeviceComponentFilter,
    DeviceRZAFilter,
    ModRZAFilter,
    ParameterFilter,
    ProductCategoryFilter,
    ProductFilter,
)
from .serializers import (
    CatalogPlacementSerializer,
    ComponentTypeSerializer,
    ComponentVisualSerializer,
    CompositeParameterFieldSerializer,
    CompositeParameterTemplateSerializer,
    DeviceComponentSerializer,
    DeviceRZAComponentSerializer,
    DeviceRZAListSerializer,
    DeviceRZAParameterSerializer,
    DeviceRZASerializer,
    ModRZAComponentSerializer,
    ModRZAListSerializer,
    ModRZAParameterSerializer,
    ModRZASerializer,
    ParameterSerializer,
    ParameterTreeSerializer,
    ParameterValueSerializer,
    ProductAttributeOptionSerializer,
    ProductAttributeSerializer,
    ProductAttributeValueSerializer,
    ProductBOMLineSerializer,
    ProductCategorySerializer,
    ProductCategoryTreeSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductSerializer,
    ProductTypeSerializer,
    RZASpecSerializer,
    TerminalLayoutSerializer,
    TypicalSchemeSerializer,
    VoltageClassSerializer,
)


# ── RZA ──────────────────────────────────────────────────────────────


class VoltageClassViewSet(viewsets.ModelViewSet):
    queryset = VoltageClass.objects.all()
    serializer_class = VoltageClassSerializer
    search_fields = ["name"]


class DeviceRZAViewSet(viewsets.ModelViewSet):
    filterset_class = DeviceRZAFilter
    search_fields = ["rza_name", "rza_code", "rza_short_name"]
    ordering_fields = ["rza_code", "rza_name", "created_at"]

    def get_queryset(self):
        return DeviceRZA.objects.annotate(
            modifications_count=Count("modifications"),
            parameters_count=Count("device_parameters"),
            components_count=Count("device_components"),
        )

    def get_serializer_class(self):
        if self.action == "list":
            return DeviceRZAListSerializer
        return DeviceRZASerializer

    @action(detail=True, methods=["get"])
    def modifications(self, request, pk=None):
        """GET /api/devices/rza/{id}/modifications/ — list modifications."""
        qs = DeviceService.get_modifications(pk, search=request.query_params.get("search", ""))
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = ModRZAListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ModRZAListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def parameters(self, request, pk=None):
        """GET /api/devices/rza/{id}/parameters/ — assigned parameters."""
        params = DeviceRZAParameter.objects.filter(
            device_rza_id=pk
        ).select_related("parameter")
        serializer = DeviceRZAParameterSerializer(params, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="parameters/available")
    def available_parameters(self, request, pk=None):
        """GET /api/devices/rza/{id}/parameters/available/"""
        params = DeviceService.get_available_parameters_for_device(pk)
        serializer = ParameterTreeSerializer(params, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="parameters/add")
    def add_parameter(self, request, pk=None):
        """POST /api/devices/rza/{id}/parameters/add/"""
        param_id = request.data.get("parameter_id")
        price = request.data.get("price", 0)
        obj, created = DeviceService.add_parameter_to_device(pk, param_id, price)
        return Response(
            DeviceRZAParameterSerializer(obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="parameters/(?P<param_id>[^/.]+)/remove")
    def remove_parameter(self, request, pk=None, param_id=None):
        """POST /api/devices/rza/{id}/parameters/{param_id}/remove/"""
        DeviceService.remove_parameter_from_device(pk, param_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def components(self, request, pk=None):
        """GET /api/devices/rza/{id}/components/ — assigned components."""
        comps = DeviceRZAComponent.objects.filter(
            device_rza_id=pk
        ).select_related("component__component_type")
        serializer = DeviceRZAComponentSerializer(comps, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="components/available")
    def available_components(self, request, pk=None):
        """GET /api/devices/rza/{id}/components/available/"""
        comps = DeviceService.get_available_components_for_device(pk)
        serializer = DeviceComponentSerializer(comps, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="components/add")
    def add_component(self, request, pk=None):
        """POST /api/devices/rza/{id}/components/add/"""
        comp_id = request.data.get("component_id")
        price = request.data.get("price", 0)
        obj, created = DeviceService.add_component_to_device(pk, comp_id, price)
        return Response(
            DeviceRZAComponentSerializer(obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="components/(?P<comp_id>[^/.]+)/remove")
    def remove_component(self, request, pk=None, comp_id=None):
        """POST /api/devices/rza/{id}/components/{comp_id}/remove/"""
        DeviceService.remove_component_from_device(pk, comp_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ModRZAViewSet(viewsets.ModelViewSet):
    filterset_class = ModRZAFilter
    search_fields = ["mod_name", "mod_code"]
    ordering_fields = ["mod_code", "mod_name", "created_at"]

    def get_queryset(self):
        return ModRZA.objects.select_related("device_rza").annotate(
            parameters_count=Count("mod_parameters"),
            components_count=Count("mod_components"),
        )

    def get_serializer_class(self):
        if self.action == "list":
            return ModRZAListSerializer
        return ModRZASerializer

    @action(detail=True, methods=["get"])
    def parameters(self, request, pk=None):
        params = ModRZAParameter.objects.filter(
            mod_rza_id=pk
        ).select_related("parameter")
        serializer = ModRZAParameterSerializer(params, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="parameters/available")
    def available_parameters(self, request, pk=None):
        params = DeviceService.get_available_parameters_for_modification(pk)
        serializer = ParameterTreeSerializer(params, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="parameters/add")
    def add_parameter(self, request, pk=None):
        param_id = request.data.get("parameter_id")
        price = request.data.get("price", 0)
        obj, created = DeviceService.add_parameter_to_modification(pk, param_id, price)
        return Response(
            ModRZAParameterSerializer(obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="parameters/(?P<param_id>[^/.]+)/remove")
    def remove_parameter(self, request, pk=None, param_id=None):
        DeviceService.remove_parameter_from_modification(pk, param_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def components(self, request, pk=None):
        comps = ModRZAComponent.objects.filter(
            mod_rza_id=pk
        ).select_related("component__component_type")
        serializer = ModRZAComponentSerializer(comps, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="components/available")
    def available_components(self, request, pk=None):
        comps = DeviceService.get_available_components_for_modification(pk)
        serializer = DeviceComponentSerializer(comps, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="components/add")
    def add_component(self, request, pk=None):
        comp_id = request.data.get("component_id")
        price = request.data.get("price", 0)
        obj, created = DeviceService.add_component_to_modification(pk, comp_id, price)
        return Response(
            ModRZAComponentSerializer(obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="components/(?P<comp_id>[^/.]+)/remove")
    def remove_component(self, request, pk=None, comp_id=None):
        DeviceService.remove_component_from_modification(pk, comp_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Parameters ───────────────────────────────────────────────────────


class ParameterViewSet(viewsets.ModelViewSet):
    queryset = Parameter.objects.all()
    filterset_class = ParameterFilter
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return ParameterTreeSerializer
        return ParameterSerializer

    @action(detail=False, methods=["get"])
    def tree(self, request):
        """GET /api/devices/parameters/tree/ — full parameter tree."""
        roots = Parameter.get_root_nodes()
        serializer = ParameterSerializer(roots, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def children(self, request, pk=None):
        """GET /api/devices/parameters/{id}/children/"""
        try:
            node = Parameter.objects.get(pk=pk)
        except Parameter.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        children = node.get_children()
        serializer = ParameterSerializer(children, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="add-child")
    def add_child(self, request, pk=None):
        """POST /api/devices/parameters/{id}/add-child/"""
        try:
            parent = Parameter.objects.get(pk=pk)
        except Parameter.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        child = parent.add_child(**request.data)
        return Response(ParameterSerializer(child).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="add-root")
    def add_root(self, request):
        """POST /api/devices/parameters/add-root/"""
        node = Parameter.add_root(**request.data)
        return Response(ParameterSerializer(node).data, status=status.HTTP_201_CREATED)


class ParameterValueViewSet(viewsets.ModelViewSet):
    queryset = ParameterValue.objects.select_related("parameter")
    serializer_class = ParameterValueSerializer
    filterset_fields = ["parameter"]


class CompositeParameterTemplateViewSet(viewsets.ModelViewSet):
    queryset = CompositeParameterTemplate.objects.all()
    serializer_class = CompositeParameterTemplateSerializer
    filterset_fields = ["parameter"]


class CompositeParameterFieldViewSet(viewsets.ModelViewSet):
    queryset = CompositeParameterField.objects.all()
    serializer_class = CompositeParameterFieldSerializer
    filterset_fields = ["composite_parameter"]


# ── Components ───────────────────────────────────────────────────────


class ComponentTypeViewSet(viewsets.ModelViewSet):
    queryset = ComponentType.objects.all()
    serializer_class = ComponentTypeSerializer
    search_fields = ["name"]


class DeviceComponentViewSet(viewsets.ModelViewSet):
    filterset_class = DeviceComponentFilter
    search_fields = ["component_name"]
    ordering_fields = ["component_name", "created_at"]

    def get_queryset(self):
        return DeviceComponent.objects.select_related("component_type")

    def get_serializer_class(self):
        return DeviceComponentSerializer

    @action(detail=True, methods=["get"])
    def visuals(self, request, pk=None):
        """GET /api/devices/components/{id}/visuals/"""
        visuals = ComponentVisual.objects.filter(component_id=pk)
        serializer = ComponentVisualSerializer(visuals, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="trigger-import")
    def trigger_import(self, request):
        """POST /api/devices/components/trigger-import/ — manually trigger ProdUX sync."""
        from apps.devices.tasks import import_components
        result = import_components.delay()
        return Response({"task_id": result.id, "status": "queued"})


class ComponentVisualViewSet(viewsets.ModelViewSet):
    queryset = ComponentVisual.objects.select_related("component")
    serializer_class = ComponentVisualSerializer
    filterset_fields = ["component", "visual_type"]


class TerminalLayoutViewSet(viewsets.ModelViewSet):
    queryset = TerminalLayout.objects.all()
    serializer_class = TerminalLayoutSerializer
    filterset_fields = ["mod_rza"]


# ── Catalog ──────────────────────────────────────────────────────────


class ProductCategoryViewSet(viewsets.ModelViewSet):
    filterset_class = ProductCategoryFilter
    search_fields = ["name", "short_name"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        return ProductCategory.objects.all()

    def get_serializer_class(self):
        if self.action == "tree":
            return ProductCategoryTreeSerializer
        return ProductCategorySerializer

    @action(detail=False, methods=["get"])
    def tree(self, request):
        """GET /api/devices/categories/tree/ — full category tree."""
        roots = ProductCategory.get_root_nodes().filter(is_active=True)
        serializer = ProductCategoryTreeSerializer(roots, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def children(self, request, pk=None):
        """GET /api/devices/categories/{id}/children/"""
        try:
            node = ProductCategory.objects.get(pk=pk)
        except ProductCategory.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        children = node.get_children().filter(is_active=True)
        serializer = ProductCategorySerializer(children, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def products(self, request, pk=None):
        """GET /api/devices/categories/{id}/products/ — products in category."""
        products = Product.objects.filter(
            catalog_placements__category_id=pk, is_active=True
        ).select_related("product_type")
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="add-child")
    def add_child(self, request, pk=None):
        """POST /api/devices/categories/{id}/add-child/"""
        try:
            parent = ProductCategory.objects.get(pk=pk)
        except ProductCategory.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        child = parent.add_child(**request.data)
        return Response(ProductCategorySerializer(child).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="add-root")
    def add_root(self, request):
        """POST /api/devices/categories/add-root/"""
        node = ProductCategory.add_root(**request.data)
        return Response(ProductCategorySerializer(node).data, status=status.HTTP_201_CREATED)


class ProductTypeViewSet(viewsets.ModelViewSet):
    queryset = ProductType.objects.all()
    serializer_class = ProductTypeSerializer
    search_fields = ["name"]


class ProductViewSet(viewsets.ModelViewSet):
    filterset_class = ProductFilter
    search_fields = ["name", "internal_code"]
    ordering_fields = ["name", "internal_code", "base_price", "created_at"]

    def get_queryset(self):
        return Product.objects.select_related("product_type")

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductSerializer

    @action(detail=True, methods=["get", "post"])
    def attributes(self, request, pk=None):
        """GET/POST /api/devices/products/{id}/attributes/"""
        if request.method == "GET":
            vals = ProductAttributeValue.objects.filter(
                product_id=pk
            ).select_related("attribute", "option")
            serializer = ProductAttributeValueSerializer(vals, many=True)
            return Response(serializer.data)

        serializer = ProductAttributeValueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"])
    def bom(self, request, pk=None):
        """GET/POST /api/devices/products/{id}/bom/"""
        if request.method == "GET":
            lines = ProductBOMLine.objects.filter(parent_id=pk).select_related("child")
            serializer = ProductBOMLineSerializer(lines, many=True)
            return Response(serializer.data)

        data = {**request.data, "parent": pk}
        serializer = ProductBOMLineSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RZASpecViewSet(viewsets.ModelViewSet):
    queryset = RZASpec.objects.select_related("device_rza", "mod_rza", "product")
    serializer_class = RZASpecSerializer
    filterset_fields = ["device_rza", "mod_rza", "product"]


class CatalogPlacementViewSet(viewsets.ModelViewSet):
    queryset = CatalogPlacement.objects.select_related("product", "category")
    serializer_class = CatalogPlacementSerializer
    filterset_fields = ["product", "category"]


class ProductAttributeViewSet(viewsets.ModelViewSet):
    queryset = ProductAttribute.objects.prefetch_related("options")
    serializer_class = ProductAttributeSerializer
    search_fields = ["name", "code"]


class ProductAttributeOptionViewSet(viewsets.ModelViewSet):
    queryset = ProductAttributeOption.objects.select_related("attribute")
    serializer_class = ProductAttributeOptionSerializer
    filterset_fields = ["attribute"]


class TypicalSchemeViewSet(viewsets.ModelViewSet):
    queryset = TypicalScheme.objects.all()
    serializer_class = TypicalSchemeSerializer
    search_fields = ["name"]
