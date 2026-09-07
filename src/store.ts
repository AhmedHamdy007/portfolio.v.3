import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: THEMES[0],
      nextTheme: () => {
        const idx = THEMES.findIndex((t) => t.type === get().theme.type)
        set({ theme: THEMES[(idx + 1) % THEMES.length] })
      },
    }),
    {
      name: 'portfolio-theme',
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
)

/* ---------- Scroll progress (fed from the canvas) ---------- */

interface ScrollStore {
  scrollProgress: number
  setScrollProgress: (p: number) => void
}

export const useScrollStore = create<ScrollStore>((set) => ({
  scrollProgress: 0,
  setScrollProgress: (p) => set(state => state.scrollProgress === p ? state : { scrollProgress: p }),
}))

/* ---------- Portals (experience tiles → overlay panels) ---------- */

interface PortalStore {
  activePortalId: string | null
  isClosing: boolean
  setActivePortal: (id: string | null) => void
  finishPortalExit: (id: string) => void
}

export const usePortalStore = create<PortalStore>((set) => ({
  activePortalId: null,
  isClosing: false,
  setActivePortal: (id) => set(state => {
    if (id === null) return state.activePortalId && !state.isClosing ? { isClosing: true } : state
    return state.activePortalId ? state : { activePortalId: id, isClosing: false }
  }),
  finishPortalExit: (id) => set(state => state.activePortalId === id && state.isClosing
    ? { activePortalId: null, isClosing: false } : state),
}))

/** Shared font paths (bundled locally — no CDN dependency). */
export const FONTS = {
  serif: '/soria-font.ttf',
  serifItalic: '/soria-font.ttf',
  sans: '/Vercetti-Regular.woff',
}
