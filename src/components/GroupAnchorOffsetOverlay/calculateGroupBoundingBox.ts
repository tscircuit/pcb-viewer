import { getBoundsFromPoints } from "@tscircuit/math-utils"
import type { PcbComponent } from "circuit-json"
import type { BoundingBox } from "../../lib/util/get-primitive-bounding-box"

export const calculateGroupBoundingBox = (
  groupComponents: PcbComponent[],
): BoundingBox | null => {
  const points: Array<{ x: number; y: number }> = []

  for (const comp of groupComponents) {
    if (
      !comp.center ||
      typeof comp.width !== "number" ||
      typeof comp.height !== "number"
    ) {
      continue
    }

    const halfWidth = comp.width / 2
    const halfHeight = comp.height / 2

    points.push({ x: comp.center.x - halfWidth, y: comp.center.y - halfHeight })
    points.push({ x: comp.center.x + halfWidth, y: comp.center.y + halfHeight })
  }

  return getBoundsFromPoints(points)
}
