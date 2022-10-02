import { Primitive, Line, Text, Circle, Rect } from "./types"
import { Drawer } from "./Drawer"

export const drawLine = (drawer: Drawer, line: Line) => {
  drawer.equip({
    size: line.width,
    shape: line.squareCap ? "square" : "circle",
    color: line.layer.name,
  })
  drawer.moveTo(line.x1, line.y1)
  drawer.lineTo(line.x2, line.y2)
}

export const drawText = (drawer: Drawer, text: Text) => {
  drawer.equip({
    fontSize: text.size,
    color: text.layer.name,
  })
  // TODO handle align
  if (text.align && text.align !== "top-left") {
    console.warn("Unhandled text align", text.align)
  }
  drawer.text(text.text, text.x, text.y)
}

export const drawRect = (drawer: Drawer, rect: Rect) => {
  drawer.equip({
    color: rect.layer.name,
  })
  if (rect.align && rect.align !== "center") {
    console.warn("Unhandled rect align", rect.align)
  }
  drawer.rect(rect.x, rect.y, rect.w, rect.h)
}

export const drawCircle = (drawer: Drawer, circle: Circle) => {
  drawer.equip({
    color: circle.layer.name,
  })
  drawer.circle(circle.x, circle.y, circle.r)
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
  }
  throw new Error(
    `Unknown primitive type: ${(primitive as any).pcb_drawing_type}`
  )
}

export const drawPrimitives = (drawer: Drawer, primitives: Primitive[]) => {
  primitives.forEach((primitive) => drawPrimitive(drawer, primitive))
}
