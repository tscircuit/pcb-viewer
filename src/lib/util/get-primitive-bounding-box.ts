import type { Primitive } from "../types"

export interface BoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

const mergeNumber = (
  a: number,
  b: number,
  fn: typeof Math.min | typeof Math.max,
) => fn(a, b)

const rotatePoint = (
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  rotationDeg: number,
) => {
  const radians = (rotationDeg * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const translatedX = x - centerX
  const translatedY = y - centerY

  const rotatedX = translatedX * cos - translatedY * sin
  const rotatedY = translatedX * sin + translatedY * cos

  return {
    x: rotatedX + centerX,
    y: rotatedY + centerY,
  }
}

const createBoxFromPoints = (
  points: { x: number; y: number }[],
): BoundingBox | null => {
  if (points.length === 0) return null

  let minX = points[0]!.x
  let maxX = points[0]!.x
  let minY = points[0]!.y
  let maxY = points[0]!.y

  for (const point of points) {
    minX = mergeNumber(minX, point.x, Math.min)
    maxX = mergeNumber(maxX, point.x, Math.max)
    minY = mergeNumber(minY, point.y, Math.min)
    maxY = mergeNumber(maxY, point.y, Math.max)
  }

  return { minX, maxX, minY, maxY }
}

const mergeBoundingBoxesInternal = (
  a: BoundingBox,
  b: BoundingBox,
): BoundingBox => ({
  minX: Math.min(a.minX, b.minX),
  maxX: Math.max(a.maxX, b.maxX),
  minY: Math.min(a.minY, b.minY),
  maxY: Math.max(a.maxY, b.maxY),
})

export const mergeBoundingBoxes = (
  existing: BoundingBox | undefined,
  next: BoundingBox,
): BoundingBox => {
  if (!existing) return next
  return mergeBoundingBoxesInternal(existing, next)
}

export const getPrimitiveBoundingBox = (
  primitive: Primitive,
): BoundingBox | null => {
  switch (primitive.pcb_drawing_type) {
    case "line": {
      const halfWidth = (primitive.width ?? 0) / 2
      const points = [
        { x: primitive.x1, y: primitive.y1 },
        { x: primitive.x2, y: primitive.y2 },
      ]

      const baseBox = createBoxFromPoints(points)
      if (!baseBox) return null

      return {
        minX: baseBox.minX - halfWidth,
        maxX: baseBox.maxX + halfWidth,
        minY: baseBox.minY - halfWidth,
        maxY: baseBox.maxY + halfWidth,
      }
    }
    case "rect": {
      const halfW = primitive.w / 2
      const halfH = primitive.h / 2
      const corners = [
        { x: primitive.x - halfW, y: primitive.y - halfH },
        { x: primitive.x + halfW, y: primitive.y - halfH },
        { x: primitive.x + halfW, y: primitive.y + halfH },
        { x: primitive.x - halfW, y: primitive.y + halfH },
      ]

      const rotation = primitive.ccw_rotation ?? 0
      const rotatedCorners =
        rotation === 0
          ? corners
          : corners.map((corner) =>
              rotatePoint(
                corner.x,
                corner.y,
                primitive.x,
                primitive.y,
                rotation,
              ),
            )

      return createBoxFromPoints(rotatedCorners)
    }
    case "circle": {
      return {
        minX: primitive.x - primitive.r,
        maxX: primitive.x + primitive.r,
        minY: primitive.y - primitive.r,
        maxY: primitive.y + primitive.r,
      }
    }
    case "oval": {
      return {
        minX: primitive.x - primitive.rX,
        maxX: primitive.x + primitive.rX,
        minY: primitive.y - primitive.rY,
        maxY: primitive.y + primitive.rY,
      }
    }
    case "pill": {
      const halfW = primitive.w / 2
      const halfH = primitive.h / 2
      const corners = [
        { x: primitive.x - halfW, y: primitive.y - halfH },
        { x: primitive.x + halfW, y: primitive.y - halfH },
        { x: primitive.x + halfW, y: primitive.y + halfH },
        { x: primitive.x - halfW, y: primitive.y + halfH },
      ]
      const rotation = primitive.ccw_rotation ?? 0
      const rotatedCorners =
        rotation === 0
          ? corners
          : corners.map((corner) =>
              rotatePoint(
                corner.x,
                corner.y,
                primitive.x,
                primitive.y,
                rotation,
              ),
            )
      return createBoxFromPoints(rotatedCorners)
    }
    case "polygon": {
      return createBoxFromPoints(primitive.points)
    }
    case "polygon_with_arcs": {
      const points = primitive.brep_shape.outer_ring.vertices.map((vertex) => ({
        x: vertex.x,
        y: vertex.y,
      }))
      return createBoxFromPoints(points)
    }
    case "text": {
      const size = primitive.size ?? 0
      const width = primitive.text ? primitive.text.length * size * 0.6 : 0
      const height = size

      if (width === 0 && height === 0) {
        return {
          minX: primitive.x,
          maxX: primitive.x,
          minY: primitive.y,
          maxY: primitive.y,
        }
      }

      const halfW = width / 2
      const halfH = height / 2
      return {
        minX: primitive.x - halfW,
        maxX: primitive.x + halfW,
        minY: primitive.y - halfH,
        maxY: primitive.y + halfH,
      }
    }
    default:
      return null
  }
}
