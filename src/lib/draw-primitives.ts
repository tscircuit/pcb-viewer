import { Drawer } from "./Drawer"
import { convertTextToLines, getTextWidth } from "./convert-text-to-lines"
import { Circle, Line, Oval, Pill, Primitive, Rect, Text } from "./types"

export const drawLine = (drawer: Drawer, line: Line) => {
  drawer.equip({
    size: line.zoomIndependent ? line.width / drawer.transform.a : line.width,
    shape: line.squareCap ? "square" : "circle",
    color: line.layer,
  })
  drawer.moveTo(line.x1, line.y1)
  drawer.lineTo(line.x2, line.y2)
}

export const drawText = (drawer: Drawer, text: Text) => {
  drawer.equip({
    fontSize: text.size,
    color: text.layer,
  })

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
  const text_lines = convertTextToLines({
    ...text,
    x: text.x + alignOffset.x,
    y: text.y + alignOffset.y,
  })
  for (const line of text_lines) {
    drawLine(drawer, line)
  }
}

export const drawRect = (drawer: Drawer, rect: Rect) => {
  drawer.equip({
    color: rect.layer,
  })
  if (rect.align && rect.align !== "center") {
    console.warn("Unhandled rect align", rect.align)
  }
  drawer.rect(rect.x, rect.y, rect.w, rect.h)
}

export const drawCircle = (drawer: Drawer, circle: Circle) => {
  drawer.equip({
    color: circle.layer,
  })
  drawer.circle(circle.x, circle.y, circle.r)
}

export const drawOval = (drawer: Drawer, oval: Oval) => {
  drawer.equip({
    color: oval.layer,
  })
  drawer.oval(oval.x, oval.y, oval.rX, oval.rY)
}

export const drawPill = (drawer: Drawer, pill: Pill) => {
  drawer.equip({
    color: pill.layer,
  })
  drawer.pill(pill.x, pill.y, pill.rX, pill.rY)
}

export const drawPrimitive = (drawer: Drawer, primitive: Primitive) => {
  switch (primitive.pcb_drawing_type) {
    case "line":
      return drawLine(drawer, primitive)
    case "text":
      return drawText(drawer, primitive)
    case "rect":
      return drawRect(drawer, primitive)
    case "circle":
      return drawCircle(drawer, primitive)
    case "oval":
      return drawOval(drawer, primitive)
    case "pill":
      return drawPill(drawer, primitive)
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
