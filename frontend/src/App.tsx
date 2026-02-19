import { Routes, Route, Navigate } from "react-router"
import { useAuthStore } from "@/stores/useAuthStore"
import { LoginPage } from "@/features/auth/LoginPage"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { AppLayout } from "@/components/layout/AppLayout"

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
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
          <Route path="/directory/*" element={<PlaceholderPage title="Справочники" />} />
          <Route path="/profile" element={<PlaceholderPage title="Профиль" />} />
          <Route path="/" element={<Navigate to="/orders" replace />} />
        </Route>
      </Route>
    </Routes>
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
