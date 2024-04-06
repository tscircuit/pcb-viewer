import { AnyElement } from "@tscircuit/builder"
import { Primitive } from "./types"

export const convertElementToPrimitives = (
  element: AnyElement,
  allElements: AnyElement[]
): Primitive[] => {
  const _parent_pcb_component =
    "pcb_component_id" in element
      ? allElements.find(
          (elm) =>
            elm.type === "pcb_component" &&
            elm.pcb_component_id === element.pcb_component_id
        )
      : undefined
  const _parent_source_component =
    _parent_pcb_component && "source_component_id" in _parent_pcb_component
      ? allElements.find(
          (elm) =>
            elm.type === "source_component" &&
            elm.source_component_id ===
              _parent_pcb_component.source_component_id
        )
      : undefined

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
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
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
          layer: "top",
          _element: element,
          _parent_pcb_component,
          _parent_source_component,
        },
        {
          pcb_drawing_type: "circle",
          x,
          y,
          r: hole_diameter / 2,
          // TODO support layer on pcb_plated_hole
          layer: "drill",

          // double highlights are annoying
          // _element: element,
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
    case "pcb_via": {
      const { x, y, outer_diameter, hole_diameter, from_layer, to_layer } =
        element

      return [
        {
          pcb_drawing_type: "circle",
          x,
          y,
          r: outer_diameter / 2,
          layer: from_layer,
          _element: element,
          _parent_pcb_component,
          _parent_source_component,
        },
        {
          pcb_drawing_type: "circle",
          x,
          y,
          r: hole_diameter / 2,
          layer: to_layer,
          // _element: element, // Avoiding double highlight for the via hole
        },
      ]
    }
  }

  // console.warn(`Unsupported element type: ${element.type}`)
  return []
}
