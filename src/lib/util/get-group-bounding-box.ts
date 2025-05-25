import type { PcbComponent } from "circuit-json"
import { applyToPoint, type Matrix } from "transformation-matrix"

export const getGroupBoundingBox = (
  childComponentsOfGroup: PcbComponent[],
  transform: Matrix,
  padding = 1,
) => {
  if (childComponentsOfGroup.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  childComponentsOfGroup.forEach((comp) => {
    const halfWidth = comp.width / 2
    const halfHeight = comp.height / 2

    minX = Math.min(minX, comp.center.x - halfWidth)
    minY = Math.min(minY, comp.center.y - halfHeight)
    maxX = Math.max(maxX, comp.center.x + halfWidth)
    maxY = Math.max(maxY, comp.center.y + halfHeight)
  })

  // Apply transform to the center point
  const transformedCenter = applyToPoint(transform, {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  })

  // Scale the width and height by the transform scale factor
  const width = (maxX - minX + padding * 2) * transform.a
  const height = (maxY - minY + padding * 2) * transform.a

  return {
    x: transformedCenter.x,
    y: transformedCenter.y,
    width,
    height,
  }
}
