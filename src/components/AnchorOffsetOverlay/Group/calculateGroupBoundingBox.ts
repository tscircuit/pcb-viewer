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

    const width =
      typeof comp.width === "number" ? comp.width : distance.parse(comp.width)
    const height =
      typeof comp.height === "number"
        ? comp.height
        : distance.parse(comp.height)

    const halfWidth = width / 2
    const halfHeight = height / 2

    points.push({ x: comp.center.x - halfWidth, y: comp.center.y - halfHeight })
    points.push({ x: comp.center.x + halfWidth, y: comp.center.y + halfHeight })
  }

  return getBoundsFromPoints(points)
}
