import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Theme = "light" | "dark" | "orange-light" | "orange-dark"

interface UIState {
  sidebarOpen: boolean
  theme: Theme
  toggleSidebar: () => void
  setTheme: (theme: Theme) => void
}

function applyThemeClasses(theme: Theme) {
  const cl = document.documentElement.classList
  cl.toggle("dark", theme === "dark" || theme === "orange-dark")
  cl.toggle("theme-orange", theme === "orange-light" || theme === "orange-dark")
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: "light",
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => {
        applyThemeClasses(theme)
        set({ theme })
      },
    }),
    {
      name: "bresler-ui",
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyThemeClasses(state.theme)
        }
      },
    },
  ),
)
