import type { Rotation } from "circuit-json"
import { type Drawer, LAYER_NAME_TO_COLOR } from "./Drawer"
import { rotateText } from "./util/rotate-text"
import { convertTextToLines, getTextWidth } from "./convert-text-to-lines"
import { lineAlphabet } from "../assets/alphabet"
import { compose, rotate, scale, translate } from "transformation-matrix"
import type {
  Circle,
  Line,
  Oval,
  Pill,
  Polygon,
  PolygonWithArcs,
  Primitive,
  Rect,
  Text,
} from "./types"
import color from "color"

function getColor(primitive: Primitive): string {
  const explicitColor = (primitive as any).color

  const baseColor =
    explicitColor ??
    LAYER_NAME_TO_COLOR[primitive.layer as keyof typeof LAYER_NAME_TO_COLOR]

  if (primitive.is_mouse_over || primitive.is_in_highlighted_net) {
    return color(baseColor).lighten(0.5).rgb().toString()
  }

  return baseColor
}

export const drawLine = (drawer: Drawer, line: Line) => {
  drawer.equip({
    size: line.zoomIndependent ? line.width / drawer.transform.a : line.width,
    shape: line.squareCap ? "square" : "circle",
    color: getColor(line),
    layer: line.layer,
  })
  drawer.moveTo(line.x1, line.y1)
  drawer.lineTo(line.x2, line.y2)
}

export const drawText = (drawer: Drawer, text: Text) => {
  drawer.equip({
    fontSize: text.size,
    color: getColor(text),
    layer: text.layer,
  })

  // Alignment offset calculation
  let alignOffset = { x: 0, y: 0 }
  const textWidth = getTextWidth(text)
  const textHeight = text.size

  switch (text.align) {
    case "top_left":
      alignOffset.x = 0
      alignOffset.y = -textHeight
      break
    case "top_center":
      alignOffset.x = -textWidth / 2
      alignOffset.y = -textHeight
      break
    case "top_right":
      alignOffset.x = -textWidth
      alignOffset.y = -textHeight
      break
    case "center_left":
      alignOffset.x = 0
      alignOffset.y = -textHeight / 2
      break
    case "center":
      alignOffset.x = -textWidth / 2
      alignOffset.y = -textHeight / 2
      break
    case "center_right":
      alignOffset.x = -textWidth
      alignOffset.y = -textHeight / 2
      break
    case "bottom_left":
      alignOffset.x = 0
      alignOffset.y = 0
      break
    case "bottom_center":
      alignOffset.x = -textWidth / 2
      alignOffset.y = 0
      break
    case "bottom_right":
      alignOffset.x = -textWidth
      alignOffset.y = 0
      break
    default: // Default to bottom_left if align is not specified or invalid
      alignOffset.x = 0
      alignOffset.y = 0
      break
  }

  // Non-gerber compatible
  // drawer.text(text.text, text.x, text.y)
  text.x ??= 0
  text.y ??= 0

  const needsCanvasFallback = requiresCanvasText(text.text)

  if (needsCanvasFallback) {
    drawCanvasText(drawer, text, alignOffset)
    return
  }

  // Get rotation anchor point based on alignment
  const rotationAnchor = {
    x: text.x,
    y: text.y,
  }

  // Generate the text lines with alignment offset
  let text_lines = convertTextToLines({
    ...text,
    x: text.x + alignOffset.x,
    y: text.y + alignOffset.y,
  })

  // If on the bottom silkscreen layer, mirror the text horizontally
  // around its anchor point text.x
  if (text.layer === "bottom_silkscreen") {
    text_lines = text_lines.map((line) => ({
      ...line,
      x1: 2 * text.x - line.x1,
      x2: 2 * text.x - line.x2,
    }))
  }

  // Apply rotation if needed
  if (text.ccw_rotation) {
    const rotateTextParams = {
      lines: text_lines,
      anchorPoint: rotationAnchor,
      ccwRotation: text.ccw_rotation,
    }
    text_lines = rotateText(rotateTextParams)
  }

  // Draw all lines with transformed context
  for (const line of text_lines) {
    drawLine(drawer, line)
  }
}

const requiresCanvasText = (value: string): boolean => {
  if (!value) return false

  for (const char of value) {
    if (char === " ") continue
    if (char === "\n" || char === "\r") return true
    if (lineAlphabet[char]) continue
    const upper = char.toUpperCase()
    if (lineAlphabet[upper] && char !== upper) {
      return true
    }
    if (!lineAlphabet[upper]) {
      return true
    }
  }

  return false
}

const drawCanvasText = (
  drawer: Drawer,
  text: Text,
  alignOffset: { x: number; y: number },
) => {
  drawer.applyAperture()
  const ctx = drawer.getLayerCtx()

  const baseX = (text.x ?? 0) + alignOffset.x
  const baseY = (text.y ?? 0) + alignOffset.y

  const actualSize = text.size ?? 1
  const fontFamily = "sans-serif"
  const fontSize = actualSize * 0.7

  const lines = text.text.split(/\r?\n/)
  const lineHeight = actualSize * 1.2

  ctx.save()
  ctx.fillStyle = drawer.aperture.color
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.font = `${fontSize}px ${fontFamily}`

  let transform = drawer.transform

  if (text.ccw_rotation) {
    const rad = ((text.ccw_rotation ?? 0) * Math.PI) / 180
    transform = compose(
      transform,
      translate(text.x ?? 0, text.y ?? 0),
      rotate(rad),
      translate(-(text.x ?? 0), -(text.y ?? 0)),
    )
  }

  if (text.layer === "bottom_silkscreen") {
    transform = compose(
      transform,
      translate(text.x ?? 0, 0),
      scale(-1, 1),
      translate(-(text.x ?? 0), 0),
    )
  }

  transform = compose(transform, translate(baseX, baseY))

  ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f)

  lines.forEach((line, index) => {
    ctx.fillText(line, 0, -index * lineHeight)
  })

  ctx.restore()
}

export const drawRect = (drawer: Drawer, rect: Rect) => {
  drawer.equip({
    color: getColor(rect),
    layer: rect.layer,
    size: rect.stroke_width,
  })
  drawer.rect({
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    mesh_fill: rect.mesh_fill,
    is_filled: rect.is_filled,
    has_stroke: rect.has_stroke,
    is_stroke_dashed: rect.is_stroke_dashed,
    stroke_width: rect.stroke_width,
    roundness: rect.roundness,
  })
}

export const drawRotatedRect = (drawer: Drawer, rect: Rect) => {
  drawer.equip({
    color: getColor(rect),
    layer: rect.layer,
  })

  drawer.rotatedRect(
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    rect.ccw_rotation!,
    rect.roundness,
    rect.mesh_fill,
  )
}

export const drawRotatedPill = (drawer: Drawer, pill: Pill) => {
  drawer.equip({
    color: getColor(pill),
    layer: pill.layer,
  })
  drawer.rotatedPill(pill.x, pill.y, pill.w, pill.h, pill.ccw_rotation!)
}

export const drawCircle = (drawer: Drawer, circle: Circle) => {
  drawer.equip({
    color: getColor(circle),
    layer: circle.layer,
  })
  drawer.circle(circle.x, circle.y, circle.r, circle.mesh_fill)
}

export const drawOval = (drawer: Drawer, oval: Oval) => {
  drawer.equip({
    color: getColor(oval),
    layer: oval.layer,
  })
  drawer.oval(oval.x, oval.y, oval.rX, oval.rY)
}

export const drawPill = (drawer: Drawer, pill: Pill) => {
  drawer.equip({
    color: getColor(pill),
    layer: pill.layer,
  })
  drawer.pill(pill.x, pill.y, pill.w, pill.h)
}

export const drawPolygon = (drawer: Drawer, polygon: Polygon) => {
  drawer.equip({
    color: getColor(polygon),
    layer: polygon.layer,
  })
  drawer.polygon(polygon.points)
}

export const drawPolygonWithArcs = (drawer: Drawer, p: PolygonWithArcs) => {
  drawer.equip({
    color: getColor(p),
    layer: p.layer,
  })
  drawer.polygonWithArcs(p.brep_shape)
}

export const drawPrimitive = (drawer: Drawer, primitive: Primitive) => {
  switch (primitive.pcb_drawing_type) {
    case "line":
      return drawLine(drawer, primitive)
    case "text":
      return drawText(drawer, primitive)
    case "rect": {
      if (primitive.ccw_rotation) {
        return drawRotatedRect(drawer, primitive)
      }
      return drawRect(drawer, primitive)
    }
    case "circle":
      return drawCircle(drawer, primitive)
    case "oval":
      return drawOval(drawer, primitive)
    case "pill":
      if (primitive.ccw_rotation) {
        return drawRotatedPill(drawer, primitive)
      }
      return drawPill(drawer, primitive)
    case "polygon":
      return drawPolygon(drawer, primitive)
    case "polygon_with_arcs":
      return drawPolygonWithArcs(drawer, primitive)
  }
}

export const drawPrimitives = (drawer: Drawer, primitives: Primitive[]) => {
  for (const primitive of primitives) {
    drawPrimitive(drawer, primitive)
  }
}
