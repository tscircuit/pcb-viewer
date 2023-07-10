import { AnyElement } from "@tscircuit/builder"
import { Primitive } from "./types"

export const convertElementToPrimitives = (
  element: AnyElement
): Primitive[] => {
  switch (element.type) {
    case "pcb_smtpad": {
      if (element.shape === "rect") {
        const { shape, x, y, width, height, layer } = element

        return [
          {
            pcb_drawing_type: "rect",
            x,
            y,
            w: width,
            h: height,
            layer: layer || { name: "top" },
          },
        ]
      } else if (element.shape === "circle") {
        console.warn(`Unsupported shape: ${element.shape} for pcb_smtpad`)
        return []
      }
    }
    case "pcb_plated_hole": {
      const { x, y, hole_diameter, outer_diameter } = element

      return [
        {
          pcb_drawing_type: "circle",
          x,
          y,
          r: outer_diameter / 2,
          // TODO support layer on pcb_plated_hole
          layer: { name: "top" },
        },
        {
          pcb_drawing_type: "circle",
          x,
          y,
          r: hole_diameter / 2,
          // TODO support layer on pcb_plated_hole
          layer: { name: "drill" },
        },
      ]
    }
    case "pcb_trace": {
      const primitives: Primitive[] = []
      let prevX: number | null = null
      let prevY: number | null = null

      for (const route of element.route) {
        if (route.route_type === "wire") {
          if (prevX !== null && prevY !== null) {
            primitives.push({
              pcb_drawing_type: "line",
              x1: prevX,
              y1: prevY,
              x2: route.x,
              y2: route.y,
              width: route.width,
              squareCap: false,
              layer: route.layer,
            })
          }

          prevX = route.x
          prevY = route.y
        }
        // Ignore "via" routes for now
      }

      return primitives
    }
  }

  console.warn(`Unsupported element type: ${element.type}`)
  return []
}
