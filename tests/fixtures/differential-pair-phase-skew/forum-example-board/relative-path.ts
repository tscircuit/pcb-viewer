import type { Point } from "circuit-json"
import { applyToPoint, compose, translate } from "transformation-matrix"
import { type ImageVertex, imagePixelsToMm } from "./constants"

// Core's pcbPath is relative to the source component center. Sample each
// round corner into straight pieces, preserving the long straight stretches.
export function relativePath({
  sourceCenterY,
  vertices,
}: { sourceCenterY: number; vertices: ImageVertex[] }): Point[] {
  const [startX] = vertices[0]!
  const imageToSource = compose(
    imagePixelsToMm,
    translate(-startX, -sourceCenterY),
  )
  return vertices.slice(1, -1).flatMap(([x, y, radius], index) => {
    if (!radius) return [applyToPoint(imageToSource, { x, y })]

    const [prevX, prevY] = vertices[index]!
    const [nextX, nextY] = vertices[index + 2]!
    const inAngle = Math.atan2(y - prevY, x - prevX)
    const outAngle = Math.atan2(nextY - y, nextX - x)
    const angleDiff = outAngle - inAngle
    const turn = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
    const sign = Math.sign(turn)
    const tangent = radius * Math.tan(Math.abs(turn) / 2)
    const centerX =
      x - tangent * Math.cos(inAngle) - sign * radius * Math.sin(inAngle)
    const centerY =
      y - tangent * Math.sin(inAngle) + sign * radius * Math.cos(inAngle)
    const startAngle = inAngle - (sign * Math.PI) / 2
    const chords = 10

    return Array.from({ length: chords + 1 }, (_, step) => {
      const angle = startAngle + (turn * step) / chords
      return applyToPoint(imageToSource, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      })
    })
  })
}
