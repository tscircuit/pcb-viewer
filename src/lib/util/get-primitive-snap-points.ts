import type { NinePointAnchor } from "circuit-json"
import type { PointWithBulge, Primitive } from "../types"

const getBrepArcMidpoint = (
  p1: PointWithBulge,
  p2: PointWithBulge,
): { x: number; y: number } | null => {
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

  const midAngle = (startAngle + endAngle) / 2
  return {
    x: cx + radius * Math.cos(midAngle),
    y: cy + radius * Math.sin(midAngle),
  }
}

export interface PrimitiveSnapPoint {
  anchor: NinePointAnchor | string
  point: { x: number; y: number }
}

const rotatePoint = (
  point: { x: number; y: number },
  center: { x: number; y: number },
  rotationDeg: number,
) => {
  const radians = (rotationDeg * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const translatedX = point.x - center.x
  const translatedY = point.y - center.y

  const rotatedX = translatedX * cos - translatedY * sin
  const rotatedY = translatedX * sin + translatedY * cos

  return {
    x: rotatedX + center.x,
    y: rotatedY + center.y,
  }
}

const getNinePointAnchors = (
  center: { x: number; y: number },
  halfWidth: number,
  halfHeight: number,
  rotationDeg: number,
): PrimitiveSnapPoint[] => {
  const basePoints: Record<NinePointAnchor, { x: number; y: number }> = {
    top_left: { x: center.x - halfWidth, y: center.y - halfHeight },
    top_center: { x: center.x, y: center.y - halfHeight },
    top_right: { x: center.x + halfWidth, y: center.y - halfHeight },
    center_left: { x: center.x - halfWidth, y: center.y },
    center: { x: center.x, y: center.y },
    center_right: { x: center.x + halfWidth, y: center.y },
    bottom_left: { x: center.x - halfWidth, y: center.y + halfHeight },
    bottom_center: { x: center.x, y: center.y + halfHeight },
    bottom_right: { x: center.x + halfWidth, y: center.y + halfHeight },
  }

  if (rotationDeg === 0) {
    return Object.entries(basePoints).map(([anchor, point]) => ({
      anchor: anchor as NinePointAnchor,
      point,
    }))
  }

  return Object.entries(basePoints).map(([anchor, point]) => ({
    anchor: anchor as NinePointAnchor,
    point: rotatePoint(point, center, rotationDeg),
  }))
}

export const getPrimitiveSnapPoints = (
  primitive: Primitive,
): PrimitiveSnapPoint[] => {
  switch (primitive.pcb_drawing_type) {
    case "rect": {
      const rotation = primitive.ccw_rotation ?? 0
      return getNinePointAnchors(
        { x: primitive.x, y: primitive.y },
        primitive.w / 2,
        primitive.h / 2,
        rotation,
      )
    }
    case "pill": {
      const rotation = primitive.ccw_rotation ?? 0
      return getNinePointAnchors(
        { x: primitive.x, y: primitive.y },
        primitive.w / 2,
        primitive.h / 2,
        rotation,
      )
    }
    case "circle": {
      return [
        { anchor: "circle_center", point: { x: primitive.x, y: primitive.y } },
        {
          anchor: "circle_right",
          point: { x: primitive.x + primitive.r, y: primitive.y },
        },
        {
          anchor: "circle_left",
          point: { x: primitive.x - primitive.r, y: primitive.y },
        },
        {
          anchor: "circle_top",
          point: { x: primitive.x, y: primitive.y - primitive.r },
        },
        {
          anchor: "circle_bottom",
          point: { x: primitive.x, y: primitive.y + primitive.r },
        },
      ]
    }
    case "oval": {
      return [
        { anchor: "oval_center", point: { x: primitive.x, y: primitive.y } },
        {
          anchor: "oval_right",
          point: { x: primitive.x + primitive.rX, y: primitive.y },
        },
        {
          anchor: "oval_left",
          point: { x: primitive.x - primitive.rX, y: primitive.y },
        },
        {
          anchor: "oval_top",
          point: { x: primitive.x, y: primitive.y - primitive.rY },
        },
        {
          anchor: "oval_bottom",
          point: { x: primitive.x, y: primitive.y + primitive.rY },
        },
      ].map(({ anchor, point }) => ({
        anchor,
        point: rotatePoint(point, primitive, primitive.ccw_rotation ?? 0),
      }))
    }
    case "line": {
      const midPoint = {
        x: (primitive.x1 + primitive.x2) / 2,
        y: (primitive.y1 + primitive.y2) / 2,
      }
      return [
        { anchor: "line_start", point: { x: primitive.x1, y: primitive.y1 } },
        { anchor: "line_mid", point: midPoint },
        { anchor: "line_end", point: { x: primitive.x2, y: primitive.y2 } },
      ]
    }
    case "polygon": {
      return primitive.points.map((point, index) => ({
        anchor: `polygon_vertex_${index}`,
        point,
      }))
    }
    case "polygon_with_arcs": {
      const vertices = primitive.brep_shape.outer_ring.vertices
      const snapPoints: PrimitiveSnapPoint[] = []

      for (let index = 0; index < vertices.length; index++) {
        const vertex = vertices[index]!
        const nextVertex = vertices[(index + 1) % vertices.length]!
        snapPoints.push({
          anchor: `polygon_with_arcs_vertex_${index}`,
          point: { x: vertex.x, y: vertex.y },
        })
        const arcMidpoint = getBrepArcMidpoint(vertex, nextVertex)
        if (arcMidpoint) {
          snapPoints.push({
            anchor: `polygon_with_arcs_arc_mid_${index}`,
            point: arcMidpoint,
          })
        }
      }

      return snapPoints
    }
    default:
      return []
  }
}
