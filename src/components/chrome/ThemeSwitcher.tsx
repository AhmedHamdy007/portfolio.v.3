import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/store'

/**
 * Top-right day/night toggle — a sun ring that flips to a moon dot,
 * echoing the reference site's icon.
 */
export default function ThemeSwitcher() {
  const theme = useThemeStore((s) => s.theme)
  const nextTheme = useThemeStore((s) => s.nextTheme)
  const isDark = theme.type === 'dark'

  return (
    <button
      onClick={nextTheme}
      aria-label="Toggle theme"
      className="fixed right-7 top-7 z-50 grid h-9 w-9 cursor-pointer place-items-center rounded-full text-[#f5f3ec] transition-transform duration-500 hover:scale-110"
    >
      {isDark ? (
        <Moon size={19} strokeWidth={1.7} fill="currentColor" />
      ) : (
        <Sun size={21} strokeWidth={1.7} fill="currentColor" />
      )}
    </button>
  )
}
