import { compose, translate } from "transformation-matrix"
import { Line } from "../types"

export function rotateText(
  lines: Line[],
  anchorPoint: { x: number; y: number },
  ccwRotation: number,
) {
  if (!ccwRotation) return lines

  const rad = (-ccwRotation * Math.PI) / 180
  const rotationMatrix = {
    a: Math.cos(rad),
    b: -Math.sin(rad),
    c: Math.sin(rad),
    d: Math.cos(rad),
    e: 0,
    f: 0,
  }

  // Create rotation transform around anchor point
  const transform = compose(
    translate(anchorPoint.x, anchorPoint.y),
    rotationMatrix,
    translate(-anchorPoint.x, -anchorPoint.y),
  )

  return lines.map((line) => ({
    ...line,
    x1:
      transform.a * (line.x1 - anchorPoint.x) +
      transform.c * (line.y1 - anchorPoint.y) +
      anchorPoint.x,
    y1:
      transform.b * (line.x1 - anchorPoint.x) +
      transform.d * (line.y1 - anchorPoint.y) +
      anchorPoint.y,
    x2:
      transform.a * (line.x2 - anchorPoint.x) +
      transform.c * (line.y2 - anchorPoint.y) +
      anchorPoint.x,
    y2:
      transform.b * (line.x2 - anchorPoint.x) +
      transform.d * (line.y2 - anchorPoint.y) +
      anchorPoint.y,
  }))
}
