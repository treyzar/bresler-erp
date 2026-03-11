import { Routes, Route, Navigate } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { useAuthStore } from "@/stores/useAuthStore"
import { LoginPage } from "@/features/auth/LoginPage"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
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
import Dashboard from "@/features/edo/pages/Dashboard"
import MainEditor from "@/features/edo/pages/MainEditor"
import Parser from "@/features/edo/pages/Parser"
import RenderTemplate from "@/features/edo/pages/RenderTemplate"

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/orders" replace /> : <LoginPage />
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/new" element={<OrderFormPage />} />
            <Route path="/orders/:orderNumber" element={<OrderDetailPage />} />
            <Route path="/orders/:orderNumber/edit" element={<OrderFormPage />} />
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
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/edo">
              <Route index element={<Dashboard />} />
              <Route path="builder" element={<MainEditor />} />
              <Route path="parser" element={<Parser />} />
              <Route path="templates" element={<RenderTemplate />} />
            </Route>
            <Route path="/" element={<Navigate to="/orders" replace />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
