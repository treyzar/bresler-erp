import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIState {
  sidebarOpen: boolean
  theme: "light" | "dark"
  toggleSidebar: () => void
  setTheme: (theme: "light" | "dark") => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: "light",
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => {
        document.documentElement.classList.toggle("dark", theme === "dark")
        set({ theme })
      },
    }),
    {
      name: "bresler-ui",
      onRehydrateStorage: () => (state) => {
        if (state?.theme === "dark") {
          document.documentElement.classList.add("dark")
        }
      },
    },
  ),
)
