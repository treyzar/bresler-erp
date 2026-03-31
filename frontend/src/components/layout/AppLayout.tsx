import { Outlet } from "react-router"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { useNotificationSocket } from "@/hooks/useNotificationSocket"

export function AppLayout() {
  // Connect to WebSocket for real-time notification updates
  useNotificationSocket()

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
