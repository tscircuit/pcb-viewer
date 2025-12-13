import type { PcbComponent } from "circuit-json"
import { distance } from "circuit-json"
import {
  type BoundingBox,
  getBoundsFromPoints,
} from "lib/util/get-primitive-bounding-box"

export const calculateGroupBoundingBox = (
  groupComponents: PcbComponent[],
): BoundingBox | null => {
  const points: Array<{ x: number; y: number }> = []

  for (const comp of groupComponents) {
    if (!comp.center) {
      continue
    }
    points.push({ x: comp.center.x, y: comp.center.y })
    points.push({ x: comp.center.x, y: comp.center.y })
  }

  return getBoundsFromPoints(points)
}
