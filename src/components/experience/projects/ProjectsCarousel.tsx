import { useMemo, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePortalStore } from '@/store'
import { PROJECTS } from '@/constants'
import ProjectTile from './ProjectTile'

export default function ProjectsCarousel() {
  const isMobile = useIsMobile()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const active = usePortalStore((state) => state.activePortalId === 'projects')
  const activeId = active ? selectedId : null
  const tiles = useMemo(() => {
    const fov = Math.PI
    const distance = 10
    const compact = PROJECTS.length <= 2
    const columns = Math.ceil(PROJECTS.length / 2)
    return PROJECTS.map((project, i) => {
      const row = i % 2
      const column = Math.floor(i / 2)
      const angle = (fov / columns) * column
      // The reference carousel is a semicircle. With only two projects there
      // is no arc to distribute, so keep the two cards stacked on its center.
      const x = compact ? 0 : -distance * Math.cos(angle)
      const z = compact ? 0 : -distance * Math.sin(angle)
      return (
        <ProjectTile
          key={i}
          project={project}
          index={i}
          position={[x, row === 0 ? 3.25 : 1, z]}
          rotation={[0, compact ? 0 : Math.PI / 2 - angle, 0]}
          activeId={activeId}
          datePosition={row === 0 ? 'top' : 'bottom'}
          onClick={() => isMobile && setSelectedId(i === selectedId ? null : i)}
        />
      )
    })
  }, [activeId, isMobile, selectedId])

  return <group rotation={[0, PROJECTS.length <= 2 ? 0 : -Math.PI / 12, 0]}>{tiles}</group>
}
