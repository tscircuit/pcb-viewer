import { Primitive, Line, Text, Circle, Rect } from "./types"
import { Drawer } from "./Drawer"
import { convertTextToLines } from "./convert-text-to-lines"

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
  // TODO handle align
  if (text.align && text.align !== "top-left") {
    console.warn("Unhandled text align", text.align)
  }

  // Non-gerber compatible
  // drawer.text(text.text, text.x, text.y)

  console.log("attempting to draw text")
  drawer.equip({
    size: 0.1,
    shape: "circle",
    color: "red",
  })
  drawer.moveTo(0, 0)
  drawer.lineTo(1, 1)
  console.log(text)
  text.x ??= 0
  text.y ??= 0
  const text_lines = convertTextToLines(text)
  console.log(text_lines)
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
    `Unknown primitive type: ${(primitive as any).pcb_drawing_type}`,
  )
}

export const drawPrimitives = (drawer: Drawer, primitives: Primitive[]) => {
  // sort primitives by draw order
  primitives.sort((a, b) => {
    const layerOrder = ["bottom", "top", "drill"]
    return layerOrder.indexOf(a.layer) - layerOrder.indexOf(b.layer)
  })
  primitives.forEach((primitive) => drawPrimitive(drawer, primitive))
}
