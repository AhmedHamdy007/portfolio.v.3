import type { Album } from '@/types'

export const ALBUM: Album[] = [
  { title: 'Memories', description: 'Captured moments and experiences' },
  { title: 'Adventures', description: 'Travels and explorations' },
  { title: 'Moments', description: 'Special times and celebrations' },
]

export const ALBUM_MOMENTS = [
  { src: '/moments/Picture1.jpg', title: 'Between floors', meta: 'KUL / 2025', aspect: 1430 / 958 },
  { src: '/moments/20240323105233_IMG_2693.jpg', title: 'Built together', meta: 'UTM / 2024', aspect: 1437 / 958 },
  { src: '/moments/WhatsApp Image 2025-07-01 at 23.28.56_897daa8b.jpg', title: 'A sharper day', meta: 'JUL / 2025', aspect: 960 / 1280 },
  { src: '/moments/photo_2026-02-22_01-25-25.jpg', title: 'At the top', meta: 'KLCC / 2026', aspect: 960 / 1280 },
  { src: '/moments/Picture3.jpg', title: 'Good people', meta: 'PETRONAS / 2025', aspect: 624 / 468 },
  { src: '/moments/4c0ca3f9-0d51-4cb9-bcbc-544d51e947c9.jpg', title: 'Interlude', meta: 'LATE / 2024', aspect: 1536 / 2048 },
] as const

export const DRIFT_MOMENTS = [
  ...ALBUM_MOMENTS,
  { src: '/moments/1674119906006.jpeg', title: 'A little further', meta: 'PERSONAL ARCHIVE', aspect: 1 },
  { src: '/moments/330329241_1190784971633023_5155274087035630998_n.jpg', title: 'In good company', meta: 'PERSONAL ARCHIVE', aspect: 1280 / 960 },
  { src: '/moments/411193537_220099847735045_7726481660113359057_n.jpg', title: 'Somewhere in between', meta: 'PERSONAL ARCHIVE', aspect: 2048 / 1366 },
  { src: '/moments/430731307_932850884838503_5438786384411185160_n.jpg', title: 'Passing through', meta: 'PERSONAL ARCHIVE', aspect: 720 / 959 },
  { src: '/moments/WhatsApp Image 2025-04-07 at 01.11.27_ca71009d.jpg', title: 'After hours', meta: 'APR / 2025', aspect: 960 / 1280 },
  { src: '/moments/WhatsApp Image 2024-06-02 at 16.21.31_0538b309.jpg', title: 'Another chapter', meta: 'JUN / 2024', aspect: 1200 / 1600 },
  { src: '/moments/281148870_1125376961342731_4182494439465188017_n.jpg', title: 'A day to keep', meta: 'PERSONAL ARCHIVE', aspect: 450 / 800 },
  { src: '/moments/WhatsApp Image 2026-03-02 at 8.49.22 PM.jpeg', title: 'Still becoming', meta: 'MAR / 2026', aspect: 1280 / 720 },
  { src: '/moments/WhatsApp Image 2025-07-06 at 08.43.42_bbc19941.jpg', title: 'Out of the ordinary', meta: 'JUL / 2025', aspect: 1920 / 2560 },
  { src: '/moments/WhatsApp Image 2025-07-12 at 21.05.34_eba53a0d.jpg', title: 'The way back', meta: 'JUL / 2025', aspect: 2268 / 4032 },
] as const
