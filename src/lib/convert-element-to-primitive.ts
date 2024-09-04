import type { AnySoupElement } from "@tscircuit/soup"
import { su } from "@tscircuit/soup-util"
import type { Primitive } from "./types"
import { type Point, getExpandedStroke } from "./util/expand-stroke"

type MetaData = {
  _parent_pcb_component?: any
  _parent_source_component?: any
  _source_port?: any
}

export const convertElementToPrimitives = (
  element: AnySoupElement,
  allElements: AnySoupElement[],
): (Primitive & MetaData)[] => {
  const _parent_pcb_component =
    "pcb_component_id" in element
      ? allElements.find(
          (elm) =>
            elm.type === "pcb_component" &&
            elm.pcb_component_id === element.pcb_component_id,
        )
      : undefined
  const _parent_source_component =
    _parent_pcb_component && "source_component_id" in _parent_pcb_component
      ? allElements.find(
          (elm) =>
            elm.type === "source_component" &&
            elm.source_component_id ===
              _parent_pcb_component.source_component_id,
        )
      : undefined

  const _source_port_id =
    "source_port_id" in element
      ? element.source_port_id
      : "pcb_port_id" in element
        ? su(allElements).pcb_port.get(element.pcb_port_id!)?.source_port_id
        : undefined

  const _source_port = _source_port_id
    ? allElements.find(
        (e) => e.type === "source_port" && e.source_port_id === _source_port_id,
      )
    : undefined

  switch (element.type) {
    case "pcb_board": {
      const { width, height, center, outline } = element

      if (outline && outline.length > 2) {
        return outline.map((point, index, array) => {
          return {
            pcb_drawing_type: "line",
            x1: point.x,
            y1: point.y,
            x2: index === array.length - 1 ? array[0].x : array[index + 1].x,
            y2: index === array.length - 1 ? array[0].y : array[index + 1].y,
            width: 1, // Add the required width property
            zoomIndependent: true,
            layer: "board",
            _element: element,
          }
        })
      }
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
      return []
    }
    case "pcb_hole": {
      if (element.hole_shape === "round" || !element.hole_shape) {
        const { x, y, hole_diameter } = element

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
      // TODO square hole
      // TODO oval hole
      return []
    }
    case "pcb_plated_hole": {
      if (element.shape === "circle") {
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
      } else if (element.shape === "oval") {
        const { x, y, outer_height, outer_width, hole_height, hole_width } =
          element

        return [
          {
            pcb_drawing_type: "oval",
            x,
            y,
            rX: outer_width / 2,
            rY: outer_height / 2,
            layer: "top", // TODO: Confirm layer handling for oval plated holes
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            _source_port,
          },
          {
            pcb_drawing_type: "oval",
            x,
            y,
            rX: hole_width / 2,
            rY: hole_height / 2,
            layer: "drill",
          },
        ]
      } else if (element.shape === "pill") {
        const { x, y, outer_height, outer_width, hole_height, hole_width } =
          element

        return [
          {
            pcb_drawing_type: "pill",
            x,
            y,
            w: outer_width,
            h: outer_height,
            layer: "top", // TODO: Confirm layer handling for oval plated holes
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            _source_port,
          },
          {
            pcb_drawing_type: "pill",
            x,
            y,
            w: hole_width,
            h: hole_height,
            layer: "drill",
          },
        ]
      } else {
        return []
      }
    }
    case "pcb_keepout": {
      if (element.shape === "circle") {
        const { center, radius } = element

        return [
          {
            pcb_drawing_type: "circle",
            x: center.x,
            y: center.y,
            r: radius,
            layer: "drill",
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            mesh_fill: true,
          },
        ]
      } else if (element.shape === "rect") { 
        const { x, y, width, height } = element

        return [
          {
            pcb_drawing_type: "rect",
            x,
            y,
            w: width,
            h: height,
            layer: "drill",
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            mesh_fill: true,
          },
        ]
      }
    }
    case "pcb_trace": {
      const primitives: Primitive[] = []

      if (element.route_thickness_mode === "interpolated") {
        // Prepare the stroke input
        const strokeInput: Point[] = element.route.map((r) => ({
          x: r.x,
          y: r.y,
          trace_width: r.route_type === "wire" ? r.width : 0.5,
        }))

        // Use getExpandedStroke to generate the polygon points
        const expandedStroke = getExpandedStroke(strokeInput, 0.5) // Use 0.5 as default width

        // Generate a single polygon primitive from the expanded stroke
        primitives.push({
          pcb_drawing_type: "polygon",
          points: expandedStroke,
          layer: element.route[0].layer, // same layer for all points
        })

        // Add circles for vias
        element.route.forEach((r) => {
          if (r.route_type === "via") {
            primitives.push({
              pcb_drawing_type: "circle",
              x: r.x,
              y: r.y,
              radius: r.outer_diameter / 2,
              fill: true,
              layer: element.route.layer,
            })
          }
        })

        return primitives
      }
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

    case "pcb_silkscreen_rect": {
      return [
        {
          pcb_drawing_type: "rect",
          x: element.center.x,
          y: element.center.y,
          w: element.width,
          h: element.height,
          layer:
            element.layer === "bottom" ? "bottom_silkscreen" : "top_silkscreen",
        },
      ]
    }

    case "pcb_silkscreen_circle": {
      return [
        {
          pcb_drawing_type: "circle",
          x: element.center.x,
          y: element.center.y,
          r: element.radius,
          layer:
            element.layer === "bottom" ? "bottom_silkscreen" : "top_silkscreen",
        },
      ]
    }

    case "pcb_silkscreen_oval": {
      return [
        {
          pcb_drawing_type: "oval",
          x: element.center.x,
          y: element.center.y,
          rX: element.radius_x / 2,
          rY: element.radius_y / 2,
          layer:
            element.layer === "bottom" ? "bottom_silkscreen" : "top_silkscreen",
        },
      ]
    }

    case "pcb_silkscreen_pill": {
      return [
        {
          pcb_drawing_type: "pill",
          x: element.center.x,
          y: element.center.y,
          w: element.width,
          h: element.height,
          layer:
            element.layer === "bottom" ? "bottom_silkscreen" : "top_silkscreen",
        },
      ]
    }

    case "pcb_silkscreen_line": {
      return [
        {
          pcb_drawing_type: "line",
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2,
          width: 0.1, // TODO add strokewidth
          squareCap: false,
          layer:
            element.layer === "bottom" ? "bottom_silkscreen" : "top_silkscreen",
        },
      ]
    }

    case "pcb_fabrication_note_path":
    case "pcb_silkscreen_path": {
      const {
        pcb_component_id,
        route, // Array<{ x: number, y: number }>
        type,
      } = element

      let layer:
        | "bottom_silkscreen"
        | "top_silkscreen"
        | "bottom_fabrication"
        | "top_fabrication"
        | null

      if (type === "pcb_silkscreen_path") {
        layer =
          element.layer === "bottom" ? "bottom_silkscreen" : "top_silkscreen"
      } else if (type === "pcb_fabrication_note_path") {
        layer = "top_fabrication"
      }

      return route
        .slice(0, -1)
        .map((point, index) => {
          const nextPoint = route[index + 1]
          return {
            pcb_drawing_type: "line",
            x1: point.x,
            y1: point.y,
            x2: nextPoint.x,
            y2: nextPoint.y,
            width: element.stroke_width ?? 0.1,
            squareCap: false,
            layer: layer!,
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            _source_port,
          } as Primitive & MetaData
        })
        .filter(Boolean)
    }

    case "pcb_silkscreen_text": {
      return [
        {
          pcb_drawing_type: "text",
          x: element.anchor_position.x,
          y: element.anchor_position.y,
          layer:
            element.layer === "bottom" ? "bottom_silkscreen" : "top_silkscreen",
          align: element.anchor_alignment ?? "center",
          text: element.text,
          size: element.font_size, // Add the required 'size' property
        },
      ]
    }

    case "pcb_fabrication_note_text": {
      return [
        {
          pcb_drawing_type: "text",
          x: element.anchor_position.x,
          y: element.anchor_position.y,
          layer:
            element.layer === "bottom"
              ? "bottom_fabrication"
              : "top_fabrication",
          size: element.font_size,
          align: element.anchor_alignment ?? "center",
          text: element.text,
        },
      ]
    }
  }

  // console.warn(`Unsupported element type: ${element.type}`)
  return []
}
