import type { PointWithBulge, Primitive } from "../types"

export interface BoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

const getBrepArcGeometry = (p1: PointWithBulge, p2: PointWithBulge) => {
  const bulge = p1.bulge
  if (!bulge || !Number.isFinite(bulge)) return null

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const chord = Math.hypot(dx, dy)
  if (!(chord > 1e-9)) return null

  const angle = 4 * Math.atan(bulge)
  const sinHalfAngle = Math.sin(angle / 2)
  if (Math.abs(sinHalfAngle) < 1e-9) return null

  const radius = Math.abs(chord / (2 * sinHalfAngle))
  const mx = (p1.x + p2.x) / 2
  const my = (p1.y + p2.y) / 2
  const perpVx = -dy / chord
  const perpVy = dx / chord
  const distToCenter = Math.sqrt(
    Math.max(0, radius * radius - (chord / 2) ** 2),
  )
  const centerSign = Math.sign(bulge) * (Math.abs(bulge) > 1 ? -1 : 1)
  const cx = mx + distToCenter * perpVx * centerSign
  const cy = my + distToCenter * perpVy * centerSign

  const startAngle = Math.atan2(p1.y - cy, p1.x - cx)
  let endAngle = Math.atan2(p2.y - cy, p2.x - cx)
  if (bulge > 0 && endAngle < startAngle) {
    endAngle += 2 * Math.PI
  } else if (bulge < 0 && endAngle > startAngle) {
    endAngle -= 2 * Math.PI
  }

  return { cx, cy, radius, startAngle, endAngle }
}

const getBrepRingBoundingPoints = (
  vertices: PointWithBulge[],
): { x: number; y: number }[] => {
  const points: { x: number; y: number }[] = []

  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i]!
    const p2 = vertices[(i + 1) % vertices.length]!
    points.push({ x: p1.x, y: p1.y })

    const arc = getBrepArcGeometry(p1, p2)
    if (!arc) continue

    const minAngle = Math.min(arc.startAngle, arc.endAngle)
    const maxAngle = Math.max(arc.startAngle, arc.endAngle)
    const halfPi = Math.PI / 2
    const firstStep = Math.ceil(minAngle / halfPi)
    const lastStep = Math.floor(maxAngle / halfPi)

    for (let step = firstStep; step <= lastStep; step++) {
      const cardinalAngle = step * halfPi
      points.push({
        x: arc.cx + arc.radius * Math.cos(cardinalAngle),
        y: arc.cy + arc.radius * Math.sin(cardinalAngle),
      })
    }
  }

  return points
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
export const getBoundsFromPoints = createBoxFromPoints

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
      const ccwRotationRadians = ((primitive.ccw_rotation ?? 0) * Math.PI) / 180
      const cos = Math.cos(ccwRotationRadians)
      const sin = Math.sin(ccwRotationRadians)
      const halfWidth = Math.hypot(primitive.rX * cos, primitive.rY * sin)
      const halfHeight = Math.hypot(primitive.rX * sin, primitive.rY * cos)
      return {
        minX: primitive.x - halfWidth,
        maxX: primitive.x + halfWidth,
        minY: primitive.y - halfHeight,
        maxY: primitive.y + halfHeight,
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
      const points = getBrepRingBoundingPoints(
        primitive.brep_shape.outer_ring.vertices,
      )
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
