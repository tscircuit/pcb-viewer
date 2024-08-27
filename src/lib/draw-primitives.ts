import { Drawer } from "./Drawer"
import { convertTextToLines, getTextWidth } from "./convert-text-to-lines"
import { Circle, Line, Oval, Pill, Polygon, Primitive, Rect, Text } from "./types"

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
  drawer.pill(pill.x, pill.y, pill.w, pill.h)
}

export const drawPolygon = (drawer: Drawer, polygon: Polygon) => {
  if (polygon.points.length < 3) {
    console.warn("Polygon must have at least 3 points")
    return
  }

  // Draw the outline of the polygon using lines
  for (let i = 0; i < polygon.points.length; i++) {
    const startPoint = polygon.points[i]
    const endPoint = polygon.points[(i + 1) % polygon.points.length] // Wrap around to the first point

    drawer.equip({
      size: 0.1, // Use a thin line for the outline
      color: polygon.layer,
      shape: "square", // Use square cap for sharp corners
    })

    drawer.moveTo(startPoint.x, startPoint.y)
    drawer.lineTo(endPoint.x, endPoint.y)
  }

  // Fill the polygon using a series of lines
  // This is a simple scanline fill algorithm
  const minY = Math.min(...polygon.points.map(p => p.y))
  const maxY = Math.max(...polygon.points.map(p => p.y))

  for (let y = minY; y <= maxY; y += 0.1) { // Adjust step size for fill density
    let intersections = []
    for (let i = 0; i < polygon.points.length; i++) {
      const p1 = polygon.points[i]
      const p2 = polygon.points[(i + 1) % polygon.points.length]
      
      if ((p1.y > y && p2.y <= y) || (p2.y > y && p1.y <= y)) {
        const x = p1.x + (y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y)
        intersections.push(x)
      }
    }

    intersections.sort((a, b) => a - b)

    for (let i = 0; i < intersections.length; i += 2) {
      if (i + 1 < intersections.length) {
        drawer.equip({
          size: 0.1, // Use a thin line for filling
          color: polygon.layer,
          shape: "square",
        })
        drawer.moveTo(intersections[i], y)
        drawer.lineTo(intersections[i + 1], y)
      }
    }
  }
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
