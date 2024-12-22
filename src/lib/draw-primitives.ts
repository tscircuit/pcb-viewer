import { Rotation } from "circuit-json"
import { Drawer, LAYER_NAME_TO_COLOR } from "./Drawer"
import { convertTextToLines, getTextWidth } from "./convert-text-to-lines"
import {
  Circle,
  Line,
  Oval,
  Pill,
  Polygon,
  Primitive,
  Rect,
  Text,
} from "./types"
import color from "color"
import { rotateText } from "./util/rotate-text-lines"

function getColor(primitive: Primitive) {
  if (primitive.is_mouse_over || primitive.is_in_highlighted_net) {
    return color(
      LAYER_NAME_TO_COLOR[primitive.layer as keyof typeof LAYER_NAME_TO_COLOR],
    )
      .lighten(0.5)
      .rgb()
      .toString()
  }
  return LAYER_NAME_TO_COLOR[
    primitive.layer as keyof typeof LAYER_NAME_TO_COLOR
  ]
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
    color: text.layer,
  })

  // Alignment offset calculation
  let alignOffset = { x: 0, y: 0 }
  const textWidth = getTextWidth(text)
  const textHeight = text.size
  if (text.align === "top_left") {
    alignOffset.y = -textHeight
  } else if (text.align === "bottom_right") {
    alignOffset.x = -textWidth
  } else if (text.align === "top_right") {
    alignOffset.x = -textWidth
    alignOffset.y = -textHeight
  } else if (text.align === "center") {
    alignOffset.x = -textWidth / 2
    alignOffset.y = -textHeight / 2
  }

  // Non-gerber compatible
  // drawer.text(text.text, text.x, text.y)
  text.x ??= 0
  text.y ??= 0

  // Center of rotation for the text
  const textCenter = {
    x: text.x + alignOffset.x + textWidth / 2,
    y: text.y + alignOffset.y + textHeight / 2,
  }

  // Generate the text lines
  const text_lines = convertTextToLines({
    ...text,
    x: text.x + alignOffset.x,
    y: text.y + alignOffset.y,
  })
  for (const line of text_lines) {
    // Rotate start and end points of each line around the text center
    if (text.ccw_rotation) {
      const textStart = {
        x: line.x1,
        y: line.y1,
        angle: text.ccw_rotation ?? 0,
        originX: textCenter.x,
        originY: textCenter.y,
      }
      const textEnd = {
        x: line.x2,
        y: line.y2,
        angle: text.ccw_rotation ?? 0,
        originX: textCenter.x,
        originY: textCenter.y,
      }
      const rotatedTextStart = rotateText(textStart)
      const rotatedTextEnd = rotateText(textEnd)

      // Use the rotated points for drawing
      drawLine(drawer, {
        ...line,
        x1: rotatedTextStart.x,
        y1: rotatedTextStart.y,
        x2: rotatedTextEnd.x,
        y2: rotatedTextEnd.y,
      })
      continue
    }
    drawLine(drawer, line)
  }
}

export const drawRect = (drawer: Drawer, rect: Rect) => {
  drawer.equip({
    color: getColor(rect),
    layer: rect.layer,
  })
  drawer.rect(rect.x, rect.y, rect.w, rect.h, rect.mesh_fill)
}

export const drawRotatedRect = (
  drawer: Drawer,
  rect: Rect & { ccw_rotation: Rotation },
) => {
  drawer.equip({
    color: getColor(rect),
    layer: rect.layer,
  })

  drawer.rotatedRect(rect.x, rect.y, rect.w, rect.h, rect.ccw_rotation)
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

export const drawPrimitive = (drawer: Drawer, primitive: Primitive) => {
  switch (primitive.pcb_drawing_type) {
    case "line":
      return drawLine(drawer, primitive)
    case "text":
      return drawText(drawer, primitive)
    case "rect":
      if (primitive._element?.shape === "rotated_rect") {
        return drawRotatedRect(drawer, {
          ...primitive,
          ccw_rotation: primitive._element.ccw_rotation,
          mesh_fill: primitive.mesh_fill,
        })
      }
      return drawRect(drawer, primitive)
    case "circle":
      return drawCircle(drawer, primitive)
    case "oval":
      return drawOval(drawer, primitive)
    case "pill":
      return drawPill(drawer, primitive)
    case "polygon":
      return drawPolygon(drawer, primitive)
  }
}

export const drawPrimitives = (drawer: Drawer, primitives: Primitive[]) => {
  // sort primitives by draw order
  primitives.sort((a, b) => {
    const layerOrder = ["bottom", "top", "drill"]
    return layerOrder.indexOf(a.layer) - layerOrder.indexOf(b.layer)
  })
  primitives.forEach((primitive) => drawPrimitive(drawer, primitive))
}
