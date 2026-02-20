import { Routes, Route, Navigate } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { useAuthStore } from "@/stores/useAuthStore"
import { LoginPage } from "@/features/auth/LoginPage"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { AppLayout } from "@/components/layout/AppLayout"
import { EquipmentPage } from "@/features/directory/EquipmentPage"
import { WorksPage } from "@/features/directory/WorksPage"
import { DesignersPage } from "@/features/directory/DesignersPage"
import { CountriesPage } from "@/features/directory/CountriesPage"
import { PQPage } from "@/features/directory/PQPage"
import { OrgUnitsPage } from "@/features/directory/OrgUnitsPage"
import { ContactsPage } from "@/features/directory/ContactsPage"

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
            <Route path="/orders" element={<PlaceholderPage title="Заказы" />} />
            <Route path="/orders/:id" element={<PlaceholderPage title="Заказ" />} />
            <Route path="/directory">
              <Route path="orgunits" element={<OrgUnitsPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="countries" element={<CountriesPage />} />
              <Route path="equipment" element={<EquipmentPage />} />
              <Route path="works" element={<WorksPage />} />
              <Route path="designers" element={<DesignersPage />} />
              <Route path="pqs" element={<PQPage />} />
              <Route index element={<Navigate to="orgunits" replace />} />
            </Route>
            <Route path="/profile" element={<PlaceholderPage title="Профиль" />} />
            <Route path="/" element={<Navigate to="/orders" replace />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground mt-2">Страница в разработке</p>
    </div>
  )
}

export default App
