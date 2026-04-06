import { Routes, Route, Navigate } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { useAuthStore } from "@/stores/useAuthStore"
import { LoginPage } from "@/features/auth/LoginPage"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { ModuleGuard } from "@/features/auth/ModuleGuard"
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
              <Route path="/orders/new" element={<OrderFormPage />} />
              <Route path="/orders/:orderNumber" element={<OrderDetailPage />} />
              <Route path="/orders/:orderNumber/edit" element={<OrderFormPage />} />
            </Route>

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
                <Route path="registry" element={<LetterRegistryPage />} />
                <Route path="registry/:id" element={<LetterDetailPage />} />
                <Route path="builder" element={<MainEditor />} />
                <Route path="parser" element={<Parser />} />
                <Route path="templates" element={<Dashboard />} />
                <Route path="templates/:id" element={<RenderTemplate />} />
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
