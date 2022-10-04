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
            layer: layer,
          },
        ]
      } else if (element.shape === "circle") {
        console.warn(`Unsupported shape: ${element.shape} for pcb_smtpad`)
        return []
      }
    }
  }

  console.warn(`Unsupported element type: ${element.type}`)
  return []
}
