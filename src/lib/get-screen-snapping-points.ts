import { applyToPoint, type Matrix } from "transformation-matrix"

export interface DimensionSnappingPoint {
  anchor: string
  point: { x: number; y: number }
  element: object | null
}

export interface ScreenDimensionSnappingPoint extends DimensionSnappingPoint {
  id: string
  screenPoint: { x: number; y: number }
}

const EMPTY_SCREEN_SNAPPING_POINTS: ScreenDimensionSnappingPoint[] = []

export function getScreenSnappingPoints({
  snappingPoints,
  realToScreenTransform,
  isEnabled,
}: {
  snappingPoints: DimensionSnappingPoint[]
  realToScreenTransform: Matrix
  isEnabled: boolean
}): ScreenDimensionSnappingPoint[] {
  if (!isEnabled) return EMPTY_SCREEN_SNAPPING_POINTS

  return snappingPoints.map((snap, index) => ({
    ...snap,
    id: `${index}-${snap.anchor}`,
    screenPoint: applyToPoint(realToScreenTransform, snap.point),
  }))
}
