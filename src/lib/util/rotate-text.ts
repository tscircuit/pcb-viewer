import { compose, translate, rotate, applyToPoint } from "transformation-matrix"
import { Line } from "../types"

export function rotateText(rotateTextParams: {
  lines: Line[]
  anchorPoint: { x: number; y: number }
  ccwRotation: number
}) {
  const { lines, anchorPoint, ccwRotation } = rotateTextParams
  if (!ccwRotation) return lines
  const rad = (ccwRotation * Math.PI) / 180
  const rotationMatrix = rotate(rad)

  // Create rotation transform around anchor point
  const transform = compose(
    translate(anchorPoint.x, anchorPoint.y),
    rotationMatrix,
    translate(-anchorPoint.x, -anchorPoint.y),
  )
  applyToPoint(transform, anchorPoint)
  return lines.map((line) => ({
    ...line,
    x1: applyToPoint(transform, { x: line.x1, y: line.y1 }).x,
    y1: applyToPoint(transform, { x: line.x1, y: line.y1 }).y,
    x2: applyToPoint(transform, { x: line.x2, y: line.y2 }).x,
    y2: applyToPoint(transform, { x: line.x2, y: line.y2 }).y,
  }))
}
