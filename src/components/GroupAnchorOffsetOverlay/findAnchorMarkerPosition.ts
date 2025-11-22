import type { BoundingBox } from "../../lib/util/get-primitive-bounding-box"
export const findAnchorMarkerPosition = (
  anchor: { x: number; y: number },
  bounds: BoundingBox,
): { x: number; y: number } => {
  const { minX, maxX, minY, maxY } = bounds

  const distToLeft = Math.abs(anchor.x - minX)
  const distToRight = Math.abs(anchor.x - maxX)
  const distToTop = Math.abs(anchor.y - maxY)
  const distToBottom = Math.abs(anchor.y - minY)

  const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom)

  if (minDist === distToLeft) return { x: minX, y: anchor.y }
  if (minDist === distToRight) return { x: maxX, y: anchor.y }
  if (minDist === distToTop) return { x: anchor.x, y: maxY }
  return { x: anchor.x, y: minY }
}
