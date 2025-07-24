import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"
type SidebarVariant = "floating" | "inset" | "sidebar"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  sidebarStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  sidebarVariant: SidebarVariant
  setSidebarVariant: (variant: SidebarVariant) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  sidebarVariant: "floating",
  setSidebarVariant: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  sidebarStorageKey = "vite-ui-sidebar-variant",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  const [sidebarVariant, setSidebarVariantState] = useState<SidebarVariant>(
    () => (localStorage.getItem(sidebarStorageKey) as SidebarVariant) || "floating"
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
      return
    }
    root.classList.add(theme)
  }, [theme])

  const setThemeWithStorage = (theme: Theme) => {
    localStorage.setItem(storageKey, theme)
    setTheme(theme)
  }

  const setSidebarVariantWithStorage = (variant: SidebarVariant) => {
    localStorage.setItem(sidebarStorageKey, variant)
    setSidebarVariantState(variant)
  }

  const value: ThemeProviderState = {
    theme,
    setTheme: setThemeWithStorage,
    sidebarVariant,
    setSidebarVariant: setSidebarVariantWithStorage,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
