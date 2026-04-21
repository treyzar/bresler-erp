from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CityViewSet,
    ContactEmploymentViewSet,
    ContactViewSet,
    CountryViewSet,
    DeliveryTypeViewSet,
    DepartmentViewSet,
    EquipmentViewSet,
    FacilityViewSet,
    OrgUnitViewSet,
    TypeOfWorkViewSet,
)

app_name = "directory"

router = DefaultRouter()
router.register("orgunits", OrgUnitViewSet, basename="orgunit")
router.register("countries", CountryViewSet, basename="country")
router.register("cities", CityViewSet, basename="city")
router.register("contacts", ContactViewSet, basename="contact")
router.register("contact-employments", ContactEmploymentViewSet, basename="contact-employment")
router.register("equipment", EquipmentViewSet, basename="equipment")
router.register("works", TypeOfWorkViewSet, basename="work")
router.register("delivery-types", DeliveryTypeViewSet, basename="delivery-type")
router.register("facilities", FacilityViewSet, basename="facility")
router.register("departments", DepartmentViewSet, basename="department")

urlpatterns = [
    path("", include(router.urls)),
]
