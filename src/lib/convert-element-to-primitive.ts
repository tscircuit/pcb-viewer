import { Soup } from "@tscircuit/builder"
import { Primitive } from "./types"

export const convertElementToPrimitives = (
  element: Soup.AnySoupElement,
  allElements: Soup.AnySoupElement[]
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
  const _source_port =
    "source_port_id" in element
      ? allElements.find(
          (e) =>
            e.type === "source_port" &&
            e.source_port_id === element.source_port_id
        )
      : undefined

  switch (element.type) {
    case "pcb_board": {
      const { width, height, center } = element
      return [
        {
          pcb_drawing_type: "line",
          x1: center.x - width / 2,
          y1: center.y - height / 2,
          x2: center.x + width / 2,
          y2: center.y - height / 2,
          width: 1, // Add the required width property
          zoomIndependent: true,
          layer: "board",
          _element: element,
        },
        {
          pcb_drawing_type: "line",
          x1: center.x - width / 2,
          y1: center.y + height / 2,
          x2: center.x + width / 2,
          y2: center.y + height / 2,
          width: 1, // Add the required width property
          zoomIndependent: true,
          layer: "board",
          _element: element,
        },
        {
          pcb_drawing_type: "line",
          x1: center.x - width / 2,
          y1: center.y - height / 2,
          x2: center.x - width / 2,
          y2: center.y + height / 2,
          width: 1, // Add the required width property
          zoomIndependent: true,
          layer: "board",
          _element: element,
        },
        {
          pcb_drawing_type: "line",
          x1: center.x + width / 2,
          y1: center.y - height / 2,
          x2: center.x + width / 2,
          y2: center.y + height / 2,
          width: 1, // Add the required width property
          zoomIndependent: true,
          layer: "board",
          _element: element,
        },
      ]
    }
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
            layer: layer || "top",
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            _source_port,
          },
        ]
      } else if (element.shape === "circle") {
        const { x, y, radius, layer } = element
        return [
          {
            pcb_drawing_type: "circle",
            x,
            y,
            r: radius,
            layer: layer || "top",
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            _source_port,
          },
        ]
      }
    }
    case "pcb_hole": {
      const { x, y, hole_diameter } = element as Soup.PCBHole

      return [
        {
          pcb_drawing_type: "circle",
          x,
          y,
          r: hole_diameter / 2,
          layer: "drill",
          _element: element,
          _parent_pcb_component,
          _parent_source_component,
        },
      ]
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
          _source_port,
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
    // The builder currently outputs these as smtpads and holes, so pcb_via isn't
    // used, but that maybe should be changed
    case "pcb_via": {
      const { x, y, outer_diameter, hole_diameter, from_layer, to_layer } =
        element

      return [
        {
          pcb_drawing_type: "circle",
          x,
          y,
          r: outer_diameter / 2,
          layer: from_layer!,
          _element: element,
          _parent_pcb_component,
          _parent_source_component,
        },
        {
          pcb_drawing_type: "circle",
          x,
          y,
          r: hole_diameter / 2,
          layer: "drill",
          _element: element,
          _parent_pcb_component,
          _parent_source_component,
        },
        {
          pcb_drawing_type: "circle",
          x,
          y,
          r: outer_diameter / 2,
          layer: to_layer!,
          _element: element,
          _parent_pcb_component,
          _parent_source_component,
        },
      ]
    }
  }

  // console.warn(`Unsupported element type: ${element.type}`)
  return []
}
