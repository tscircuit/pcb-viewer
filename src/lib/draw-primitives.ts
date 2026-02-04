import { type Drawer, LAYER_NAME_TO_COLOR } from "./Drawer"
import { rotateText } from "./util/rotate-text"
import { convertTextToLines, getTextMetrics } from "./convert-text-to-lines"
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

  const baseColorString =
    explicitColor ??
    LAYER_NAME_TO_COLOR[primitive.layer as keyof typeof LAYER_NAME_TO_COLOR]

  let c = color(baseColorString)

  if (primitive._element?.type === "pcb_copper_pour") {
    c = c.alpha(0.7)
  }

  if (primitive.is_mouse_over || primitive.is_in_highlighted_net) {
    return c.lighten(0.5).rgb().toString()
  }

  return c.rgb().toString()
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

/**
 * Calculate alignment offset for text based on its dimensions and alignment setting
 */
const getAlignOffset = (
  textWidth: number,
  textHeight: number,
  align?: string,
): { x: number; y: number } => {
  switch (align) {
    case "top_left":
      return { x: 0, y: -textHeight }
    case "top_center":
      return { x: -textWidth / 2, y: -textHeight }
    case "top_right":
      return { x: -textWidth, y: -textHeight }
    case "center_left":
      return { x: 0, y: -textHeight / 2 }
    case "center":
      return { x: -textWidth / 2, y: -textHeight / 2 }
    case "center_right":
      return { x: -textWidth, y: -textHeight / 2 }
    case "bottom_left":
      return { x: 0, y: 0 }
    case "bottom_center":
      return { x: -textWidth / 2, y: 0 }
    case "bottom_right":
      return { x: -textWidth, y: 0 }
    default:
      return { x: 0, y: 0 }
  }
}

/**
 * Determine if text should be mirrored based on layer and is_mirrored property
 */
const shouldMirrorText = (text: Text): boolean => {
  // Bottom copper layer should auto-mirror (like bottom silkscreen)
  if (text.layer === "bottom_silkscreen" || text.layer === "bottom") {
    // If is_mirrored is explicitly set to false, don't mirror
    return text.is_mirrored !== false
  }
  // For other layers, only mirror if explicitly requested
  return text.is_mirrored === true
}

export const drawText = (drawer: Drawer, text: Text) => {
  drawer.equip({
    fontSize: text.size,
    color: getColor(text),
    layer: text.layer,
  })

  const { width: textWidth, height: textHeight } = getTextMetrics(text)
  const alignOffset = getAlignOffset(textWidth, textHeight, text.align)

  text.x ??= 0
  text.y ??= 0

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

  // Mirror text if needed (bottom layers or explicit is_mirrored)
  if (shouldMirrorText(text)) {
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

/**
 * Draw knockout text - a filled rectangle with text cut out (transparent)
 */
export const drawKnockoutText = (drawer: Drawer, text: Text) => {
  const {
    width: textWidth,
    height: textHeight,
    lineHeight,
  } = getTextMetrics(text)

  text.x ??= 0
  text.y ??= 0

  // Calculate padding
  const padding = text.knockout_padding ?? {
    left: text.size * 0.5,
    right: text.size * 0.5,
    top: text.size * 0.3,
    bottom: text.size * 0.3,
  }

  // Calculate the rectangle bounds
  const rectWidth = textWidth + padding.left + padding.right
  const rectHeight = textHeight + padding.top + padding.bottom

  // For knockout, we render text centered within the rectangle.
  // The rectangle is centered at the anchor point (text.x, text.y).
  // Text bounding box when drawn at origin (0,0):
  //   - X: from 0 to textWidth (left-aligned, each line centered within)
  //   - Y: from 0 (bottom of first line baseline) to lineHeight (top of first line)
  //        then going down: line N is at Y = -N * (lineHeight + spacing)
  //   - So Y ranges from lineHeight (top) to lineHeight - textHeight (bottom)
  //
  // To center the text in the rectangle, we need to offset it so that
  // the text's center aligns with the rectangle's center (which is at anchor).

  // Text center when drawn at (0, 0):
  const textCenterXAtOrigin = textWidth / 2
  const textCenterYAtOrigin = lineHeight - textHeight / 2

  // To center text at anchor point, offset by negative of center
  const textDrawX = text.x - textCenterXAtOrigin
  const textDrawY = text.y - textCenterYAtOrigin

  // Get rotation anchor point
  const rotationAnchor = {
    x: text.x,
    y: text.y,
  }

  // Draw the filled rectangle centered at anchor
  const rect: Rect = {
    _pcb_drawing_object_id: `knockout_rect_${text._pcb_drawing_object_id}`,
    pcb_drawing_type: "rect",
    x: text.x,
    y: text.y,
    w: rectWidth,
    h: rectHeight,
    layer: text.layer,
    ccw_rotation: text.ccw_rotation,
  }

  // If mirrored, the rectangle stays centered at anchor (no adjustment needed)
  // but text will be mirrored around the anchor

  // Draw the background rectangle
  if (text.ccw_rotation) {
    drawRotatedRect(drawer, rect)
  } else {
    drawRect(drawer, rect)
  }

  // Generate the text lines positioned to be centered in the rectangle
  let text_lines = convertTextToLines({
    ...text,
    x: textDrawX,
    y: textDrawY,
  })

  // Mirror text if needed (around the anchor point)
  if (shouldMirrorText(text)) {
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

  // Draw text lines with destination-out mode to cut them from the rectangle
  // We draw directly instead of using drawLine to preserve the subtract mode
  for (const line of text_lines) {
    drawer.equip({
      size: line.width,
      shape: "circle",
      color: "black",
      layer: text.layer,
      mode: "subtract",
    })
    drawer.moveTo(line.x1, line.y1)
    drawer.lineTo(line.x2, line.y2)
  }

  // Reset to normal mode
  drawer.equip({
    mode: "add",
  })
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
  drawer.circle(
    circle.x,
    circle.y,
    circle.r,
    circle.mesh_fill,
    circle.is_filled,
  )
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
      if (primitive.is_knockout) {
        return drawKnockoutText(drawer, primitive)
      }
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
