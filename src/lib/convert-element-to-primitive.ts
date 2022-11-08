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
  }

  console.warn(`Unsupported element type: ${element.type}`)
  return []
}
