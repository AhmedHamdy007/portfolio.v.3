import { create } from 'zustand'

interface AlbumState {
  selected: number | null
  indexOpen: boolean
  ready: boolean
  entryReady: boolean
  assetErrors: string[]
  select: (index: number | null) => void
  setReady: (ready: boolean) => void
}

export const useAlbumState = create<AlbumState>((set) => ({
  selected: null,
  indexOpen: false,
  ready: false,
  entryReady: false,
  assetErrors: [],
  select: (selected) => set({ selected }),
  setReady: (ready) => set({ ready }),
}))
