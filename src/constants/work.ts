import * as THREE from 'three'
import type { WorkTimelinePoint } from '@/types'

export const WORK_TIMELINE: WorkTimelinePoint[] = [
  { point: new THREE.Vector3(0, 0, 0), year: '2026', title: 'UTM', subtitle: 'Academic chapter · Software Engineering', position: 'right' },
  { point: new THREE.Vector3(-4, -4, -3), year: '2025–26', title: 'PETRONAS', subtitle: 'Software Engineering & DevOps Intern', position: 'left' },
  { point: new THREE.Vector3(0, -1, -8), year: 'NOW', title: 'Building...', subtitle: 'Cloud-native systems & thoughtful products', position: 'right' },
]
