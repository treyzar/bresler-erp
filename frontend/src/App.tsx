import { Routes, Route, Navigate } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { useAuthStore } from "@/stores/useAuthStore"
import { LoginPage } from "@/features/auth/LoginPage"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { ModuleGuard } from "@/features/auth/ModuleGuard"
import { GroupGuard } from "@/features/auth/GroupGuard"
import { ForbiddenPage } from "@/features/auth/ForbiddenPage"
import { AppLayout } from "@/components/layout/AppLayout"
import { EquipmentPage } from "@/features/directory/EquipmentPage"
import { WorksPage } from "@/features/directory/WorksPage"
import { CountriesPage } from "@/features/directory/CountriesPage"
import { CitiesPage } from "@/features/directory/CitiesPage"
import { OrgUnitsPage } from "@/features/directory/OrgUnitsPage"
import { ContactsPage } from "@/features/directory/ContactsPage"
import { FacilitiesPage } from "@/features/directory/FacilitiesPage"
import { DeliveryTypesPage } from "@/features/directory/DeliveryTypesPage"
import { OrdersPage } from "@/features/orders/OrdersPage"
import { OrderFormPage } from "@/features/orders/OrderFormPage"
import { OrderDetailPage } from "@/features/orders/OrderDetailPage"
import { ProfilePage } from "@/features/profile/ProfilePage"
import { ManagerDashboard } from "@/features/profile/ManagerDashboard"
import { EdoHomePage } from "@/features/edo/pages/EdoHomePage"
import Dashboard from "@/features/edo/pages/Dashboard"
import MainEditor from "@/features/edo/pages/MainEditor"
import Parser from "@/features/edo/pages/Parser"
import RenderTemplate from "@/features/edo/pages/RenderTemplate"
import { LetterRegistryPage } from "@/features/edo/pages/LetterRegistryPage"
import { LetterDetailPage } from "@/features/edo/pages/LetterDetailPage"
import { MyDocumentsPage } from "@/features/edo/internal-docs/pages/MyDocumentsPage"
import { DocumentListPage } from "@/features/edo/internal-docs/pages/DocumentListPage"
import { CatalogPage as InternalDocsCatalog } from "@/features/edo/internal-docs/pages/CatalogPage"
import { CreateDocumentPage } from "@/features/edo/internal-docs/pages/CreateDocumentPage"
import { DocumentDetailPage as InternalDocDetail } from "@/features/edo/internal-docs/pages/DocumentDetailPage"
import { AdminTypesPage as EdoAdminTypesPage } from "@/features/edo/internal-docs/pages/AdminTypesPage"
import { AdminTypeEditPage as EdoAdminTypeEditPage } from "@/features/edo/internal-docs/pages/AdminTypeEditPage"
import { AdminOrgHeadsPage as EdoAdminOrgHeadsPage } from "@/features/edo/internal-docs/pages/AdminOrgHeadsPage"
import { AdminReportsPage as EdoAdminReportsPage } from "@/features/edo/internal-docs/pages/AdminReportsPage"
import { DashboardPage } from "@/features/dashboard/DashboardPage"
import { NotificationsPage } from "@/features/notifications/NotificationsPage"
import { ImportPage } from "@/features/import/ImportPage"
import { ReportsPage } from "@/features/reports/ReportsPage"
import { DevicesPage } from "@/features/devices/DevicesPage"
import { DeviceDetailPage } from "@/features/devices/DeviceDetailPage"
import { ComponentsPage } from "@/features/devices/ComponentsPage"
import { CatalogPage } from "@/features/devices/CatalogPage"
import { VoltageClassesPage } from "@/features/devices/VoltageClassesPage"
import { ProductTypesPage } from "@/features/devices/ProductTypesPage"
import { StockPage } from "@/features/purchasing/StockPage"
import { PurchaseOrdersPage } from "@/features/purchasing/PurchaseOrdersPage"
import { PurchaseRequestsPage } from "@/features/purchasing/PurchaseRequestsPage"
import { PaymentsPage } from "@/features/purchasing/PaymentsPage"
import { SupplierPage } from "@/features/purchasing/SupplierPage"
import { PurchasingDashboard } from "@/features/purchasing/PurchasingDashboard"
import { BOMCostPage } from "@/features/purchasing/BOMCostPage"
import { ComingSoon } from "@/components/shared/ComingSoon"

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/403" element={<ForbiddenPage />} />

            <Route element={<ModuleGuard module="orders" />}>
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/offers" element={<ComingSoon title="Все ТКП" hint="Здесь будет сводная таблица технико-коммерческих предложений по всем заказам." />} />
              <Route path="/orders/contracts" element={<ComingSoon title="Все договоры" hint="Здесь будет сводная таблица договоров по всем заказам." />} />
              <Route path="/orders/new" element={<OrderFormPage />} />
              <Route path="/orders/:orderNumber" element={<OrderDetailPage />} />
              <Route path="/orders/:orderNumber/edit" element={<OrderFormPage />} />
            </Route>

            <Route path="/accounting" element={<ComingSoon title="Бухгалтерия" hint="Модуль бухгалтерии запланирован на будущие релизы." />} />

            <Route element={<ModuleGuard module="directory" />}>
              <Route path="/directory">
                <Route path="orgunits" element={<OrgUnitsPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="countries" element={<CountriesPage />} />
                <Route path="equipment" element={<EquipmentPage />} />
                <Route path="works" element={<WorksPage />} />
                <Route path="cities" element={<CitiesPage />} />
                <Route path="facilities" element={<FacilitiesPage />} />
                <Route path="delivery-types" element={<DeliveryTypesPage />} />
                <Route index element={<Navigate to="orgunits" replace />} />
              </Route>
            </Route>

            <Route element={<ModuleGuard module="devices" />}>
              <Route path="/devices">
                <Route path="rza" element={<DevicesPage />} />
                <Route path="rza/:id" element={<DeviceDetailPage />} />
                <Route path="components" element={<ComponentsPage />} />
                <Route path="catalog" element={<CatalogPage />} />
                <Route path="voltage-classes" element={<VoltageClassesPage />} />
                <Route path="product-types" element={<ProductTypesPage />} />
                <Route index element={<Navigate to="rza" replace />} />
              </Route>
            </Route>

            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/manager-dashboard" element={<ManagerDashboard />} />

            <Route element={<ModuleGuard module="edo" />}>
              <Route path="/edo">
                <Route index element={<EdoHomePage />} />
                <Route path="my" element={<MyDocumentsPage />} />
                <Route path="inbox" element={<DocumentListPage tab="inbox" />} />
                <Route path="outbox" element={<DocumentListPage tab="outbox" />} />
                <Route path="drafts" element={<DocumentListPage tab="drafts" />} />
                <Route path="archive" element={<DocumentListPage tab="archive" />} />
                <Route path="new" element={<InternalDocsCatalog />} />
                <Route path="new/:code" element={<CreateDocumentPage />} />
                <Route path="documents/:id" element={<InternalDocDetail />} />
                <Route path="admin" element={<GroupGuard group="admin" />}>
                  <Route path="types" element={<EdoAdminTypesPage />} />
                  <Route path="types/:code" element={<EdoAdminTypeEditPage />} />
                  <Route path="org-heads" element={<EdoAdminOrgHeadsPage />} />
                  <Route path="reports" element={<EdoAdminReportsPage />} />
                </Route>
                <Route path="registry" element={<LetterRegistryPage />} />
                <Route path="registry/:id" element={<LetterDetailPage />} />
                <Route path="builder" element={<MainEditor />} />
                <Route path="parser" element={<Parser />} />
                <Route path="templates" element={<Dashboard />} />
                <Route path="templates/:id" element={<RenderTemplate />} />
              </Route>
            </Route>

            <Route element={<ModuleGuard module="purchasing" />}>
              <Route path="/purchasing">
                <Route path="stock" element={<StockPage />} />
                <Route path="orders" element={<PurchaseOrdersPage />} />
                <Route path="requests" element={<PurchaseRequestsPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="suppliers" element={<SupplierPage />} />
                <Route path="dashboard" element={<PurchasingDashboard />} />
                <Route path="bom-cost" element={<BOMCostPage />} />
                <Route index element={<Navigate to="orders" replace />} />
              </Route>
            </Route>

            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
