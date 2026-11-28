import { BUMP_DEPTH_PX, type ImageVertex } from "./constants"

export function tuningBump({
  x,
  y,
  dx,
  dy,
  depth = BUMP_DEPTH_PX,
}: {
  x: number
  y: number
  dx: number
  dy: number
  depth?: number
}): ImageVertex[] {
  const width = 28.2
  const radius = 11.75
  const farX = x + width * dx
  const farY = y + width * dy
  return [
    [x, y, radius],
    [x + depth * dy, y - depth * dx, radius],
    [farX + depth * dy, farY - depth * dx, radius],
    [farX, farY, radius],
  ]
}
