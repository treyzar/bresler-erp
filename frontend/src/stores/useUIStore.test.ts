import { useUIStore, type Theme } from "./useUIStore"

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState({ sidebarOpen: true, theme: "light" })
    document.documentElement.classList.remove("dark", "theme-orange")
  })

  it("starts with default state", () => {
    const state = useUIStore.getState()
    expect(state.sidebarOpen).toBe(true)
    expect(state.theme).toBe("light")
  })

  it("toggleSidebar flips the state", () => {
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(false)

    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })

  it("setTheme updates the theme", () => {
    useUIStore.getState().setTheme("dark")
    expect(useUIStore.getState().theme).toBe("dark")
  })

  it("setTheme applies 'dark' class for dark themes", () => {
    useUIStore.getState().setTheme("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.classList.contains("theme-orange")).toBe(false)
  })

  it("setTheme applies 'theme-orange' class for orange themes", () => {
    useUIStore.getState().setTheme("orange-light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(document.documentElement.classList.contains("theme-orange")).toBe(true)
  })

  it("setTheme applies both classes for orange-dark", () => {
    useUIStore.getState().setTheme("orange-dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.classList.contains("theme-orange")).toBe(true)
  })

  it("setTheme removes classes for light theme", () => {
    useUIStore.getState().setTheme("dark")
    useUIStore.getState().setTheme("light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(document.documentElement.classList.contains("theme-orange")).toBe(false)
  })

  it("cycles through all themes correctly", () => {
    const themes: Theme[] = ["light", "dark", "orange-light", "orange-dark"]
    for (const theme of themes) {
      useUIStore.getState().setTheme(theme)
      expect(useUIStore.getState().theme).toBe(theme)
    }
  })
})
