import { create } from 'zustand'

/* ---------- Theme (light sky / dark night) ---------- */

interface Theme {
  type: 'light' | 'dark'
  color: string
}

const THEMES: Theme[] = [
  { type: 'light', color: '#0690d4' },
  { type: 'dark', color: '#111111' },
]

interface ThemeStore {
  theme: Theme
  nextTheme: () => void
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: THEMES[0],
  nextTheme: () => {
    const idx = THEMES.findIndex((t) => t.type === get().theme.type)
    set({ theme: THEMES[(idx + 1) % THEMES.length] })
  },
}))

/* ---------- Scroll progress (fed from the canvas) ---------- */

interface ScrollStore {
  scrollProgress: number
  setScrollProgress: (p: number) => void
}

export const useScrollStore = create<ScrollStore>((set) => ({
  scrollProgress: 0,
  setScrollProgress: (p) => set({ scrollProgress: p }),
}))

/* ---------- Portals (experience tiles → overlay panels) ---------- */

interface PortalStore {
  activePortalId: string | null
  setActivePortal: (id: string | null) => void
}

export const usePortalStore = create<PortalStore>((set) => ({
  activePortalId: null,
  setActivePortal: (id) => set({ activePortalId: id }),
}))

/** Shared font paths (bundled locally — no CDN dependency). */
export const FONTS = {
  serif: '/fonts/playfair.ttf',
  serifItalic: '/fonts/playfair-italic.ttf',
  sans: '/fonts/inter.ttf',
}
