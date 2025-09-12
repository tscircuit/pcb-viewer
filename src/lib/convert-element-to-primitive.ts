import type { AnyCircuitElement } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import type { Primitive } from "./types"
import { type Point, getExpandedStroke } from "./util/expand-stroke"

type MetaData = {
  _parent_pcb_component?: any
  _parent_source_component?: any
  _source_port?: any
}

let globalPcbDrawingObjectCount = 0

export const getNewPcbDrawingObjectId = (prefix: string) =>
  `${prefix}_${globalPcbDrawingObjectCount++}`

export const convertElementToPrimitives = (
  element: AnyCircuitElement,
  allElements: AnyCircuitElement[],
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
        ? su(allElements as any).pcb_port.get(element.pcb_port_id!)
            ?.source_port_id
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
            _pcb_drawing_object_id: `line_${globalPcbDrawingObjectCount++}`,
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
          _pcb_drawing_object_id: `line_${globalPcbDrawingObjectCount++}`,
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
          _pcb_drawing_object_id: `line_${globalPcbDrawingObjectCount++}`,
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
          _pcb_drawing_object_id: `line_${globalPcbDrawingObjectCount++}`,
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
          _pcb_drawing_object_id: `line_${globalPcbDrawingObjectCount++}`,
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
      if (element.shape === "rect" || element.shape === "rotated_rect") {
        const { shape, x, y, width, height, layer } = element
        const rect_border_radius = (element as any).rect_border_radius

        return [
          {
            _pcb_drawing_object_id: `rect_${globalPcbDrawingObjectCount++}`,
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
            ccw_rotation: (element as any).ccw_rotation,
            roundness: rect_border_radius,
          },
        ]
      } else if (element.shape === "circle") {
        const { x, y, radius, layer } = element
        return [
          {
            _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
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
      if (element.hole_shape === "circle" || !element.hole_shape) {
        const { x, y, hole_diameter } = element

        return [
          {
            _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
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
            _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
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
            _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
            pcb_drawing_type: "circle",
            x,
            y,
            r: hole_diameter / 2,
            // TODO support layer on pcb_plated_hole
            layer: "drill",
            _element: element,

            // double highlights are annoying
            // _element: element,
          },
        ]
      } else if (element.shape === "oval") {
        const { x, y, outer_height, outer_width, hole_height, hole_width } =
          element

        return [
          {
            _pcb_drawing_object_id: `oval_${globalPcbDrawingObjectCount++}`,
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
            _pcb_drawing_object_id: `oval_${globalPcbDrawingObjectCount++}`,
            _element: element,
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
            _pcb_drawing_object_id: `pill_${globalPcbDrawingObjectCount++}`,
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
            _pcb_drawing_object_id: `pill_${globalPcbDrawingObjectCount++}`,
            _element: element,
            pcb_drawing_type: "pill",
            x,
            y,
            w: hole_width,
            h: hole_height,
            layer: "drill",
          },
        ]
      } else if (element.shape === "circular_hole_with_rect_pad") {
        const { x, y, hole_diameter, rect_pad_width, rect_pad_height } = element
        const rect_border_radius = (element as any).rect_border_radius
        const hole_offset_x = (element as any).hole_offset_x ?? 0
        const hole_offset_y = (element as any).hole_offset_y ?? 0

        return [
          {
            _pcb_drawing_object_id: `rect_${globalPcbDrawingObjectCount++}`,
            pcb_drawing_type: "rect",
            x,
            y,
            w: rect_pad_width,
            h: rect_pad_height,
            layer: "top", // Rectangular pad on top layer
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            _source_port,
            roundness: rect_border_radius,
          },
          {
            _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
            _element: element,
            pcb_drawing_type: "circle",
            x: x + hole_offset_x,
            y: y + hole_offset_y,
            r: hole_diameter / 2,
            layer: "drill", // Circular hole in drill layer
          },
        ]
      } else if (element.shape === "pill_hole_with_rect_pad") {
        const {
          x,
          y,
          hole_width,
          hole_height,
          rect_pad_width,
          rect_pad_height,
        } = element
        const rect_border_radius = (element as any).rect_border_radius

        return [
          {
            _pcb_drawing_object_id: `rect_${globalPcbDrawingObjectCount++}`,
            pcb_drawing_type: "rect",
            x,
            y,
            w: rect_pad_width,
            h: rect_pad_height,
            layer: "top", // Rectangular pad on top layer
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            _source_port,
            roundness: rect_border_radius,
          },
          {
            _pcb_drawing_object_id: `pill_${globalPcbDrawingObjectCount++}`,
            _element: element,
            pcb_drawing_type: "pill",
            x,
            y,
            w: hole_width,
            h: hole_height,
            layer: "drill", // Pill-shaped hole in drill layer
          },
        ]
      } else if (element.shape === "rotated_pill_hole_with_rect_pad") {
        const {
          x,
          y,
          hole_width,
          hole_height,
          hole_ccw_rotation,
          rect_pad_width,
          rect_pad_height,
          rect_ccw_rotation,
        } = element as any // Use as any to access new properties
        const rect_border_radius = (element as any).rect_border_radius

        return [
          {
            _pcb_drawing_object_id: `rect_${globalPcbDrawingObjectCount++}`,
            pcb_drawing_type: "rect",
            x,
            y,
            w: rect_pad_width,
            h: rect_pad_height,
            layer: "top", // Rectangular pad on top layer
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            _source_port,
            ccw_rotation: rect_ccw_rotation,
            roundness: rect_border_radius,
          },
          {
            _pcb_drawing_object_id: `pill_${globalPcbDrawingObjectCount++}`,
            _element: element,
            pcb_drawing_type: "pill",
            x,
            y,
            w: hole_width,
            h: hole_height,
            layer: "drill", // Pill-shaped hole in drill layer
            ccw_rotation: hole_ccw_rotation,
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
            _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
            pcb_drawing_type: "circle",
            x: center.x,
            y: center.y,
            r: radius,
            layer: "top",
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            mesh_fill: true,
          },
        ]
      } else if (element.shape === "rect") {
        const { center, width, height } = element

        return [
          {
            _pcb_drawing_object_id: `rect_${globalPcbDrawingObjectCount++}`,
            pcb_drawing_type: "rect",
            x: center.x,
            y: center.y,
            w: width,
            h: height,
            layer: "top",
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            mesh_fill: true,
          },
        ]
      }
      break
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

        const layer = (element.route[0] as any).layer

        // Generate a single polygon primitive from the expanded stroke
        primitives.push({
          _pcb_drawing_object_id: `polygon_${globalPcbDrawingObjectCount++}`,
          _element: element,
          pcb_drawing_type: "polygon",
          points: expandedStroke,
          layer, // same layer for all points
        })

        // Add circles for vias
        element.route.forEach((r) => {
          if (r.route_type === "via") {
            primitives.push({
              _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
              _element: element,
              pcb_drawing_type: "circle",
              x: r.x,
              y: r.y,
              r: (r as any).outer_diameter / 2,
              layer: (r as any).from_layer,
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
              _pcb_drawing_object_id: `line_${globalPcbDrawingObjectCount++}`,
              _element: element,
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
          _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
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
          _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
          _element: element,
          pcb_drawing_type: "circle",
          x,
          y,
          r: hole_diameter / 2,
          layer: "drill",
          _parent_pcb_component,
          _parent_source_component,
        },
        {
          _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
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
          _pcb_drawing_object_id: `rect_${globalPcbDrawingObjectCount++}`,
          pcb_drawing_type: "rect",
          x: element.center.x,
          y: element.center.y,
          w: element.width,
          h: element.height,
          layer:
            element.layer === "bottom" ? "bottom_silkscreen" : "top_silkscreen",
          stroke_width: element.stroke_width,
          is_filled: element.is_filled,
          has_stroke: element.has_stroke,
          is_stroke_dashed: element.is_stroke_dashed,
          _element: element,
        },
      ]
    }

    case "pcb_silkscreen_circle": {
      return [
        {
          _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
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
          _pcb_drawing_object_id: `oval_${globalPcbDrawingObjectCount++}`,
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

    // @ts-ignore
    case "pcb_silkscreen_pill": {
      return [
        {
          _pcb_drawing_object_id: `pill_${globalPcbDrawingObjectCount++}`,
          pcb_drawing_type: "pill",
          // @ts-ignore
          x: element.center.x,
          // @ts-ignore
          y: element.center.y,
          // @ts-ignore
          w: element.width,
          // @ts-ignore
          h: element.height,
          layer:
            // @ts-ignore
            element.layer === "bottom" ? "bottom_silkscreen" : "top_silkscreen",
        },
      ]
    }

    case "pcb_silkscreen_line": {
      return [
        {
          _pcb_drawing_object_id: `line_${globalPcbDrawingObjectCount++}`,
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
            _pcb_drawing_object_id: `line_${globalPcbDrawingObjectCount++}`,
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
          _pcb_drawing_object_id: `text_${globalPcbDrawingObjectCount++}`,
          pcb_drawing_type: "text",
          x: element.anchor_position.x,
          y: element.anchor_position.y,
          layer:
            element.layer === "bottom" ? "bottom_silkscreen" : "top_silkscreen",
          align: element.anchor_alignment ?? "center",
          text: element.text,
          size: element.font_size, // Add the required 'size' property
          ccw_rotation: element.ccw_rotation,
        },
      ]
    }
    case "pcb_copper_pour": {
      const pour = element as any
      switch (pour.shape) {
        case "rect": {
          return [
            {
              _pcb_drawing_object_id: getNewPcbDrawingObjectId(
                "pcb_copper_pour_rect",
              ),
              pcb_drawing_type: "rect",
              x: pour.center.x,
              y: pour.center.y,
              w: pour.width,
              h: pour.height,
              layer: pour.layer,
              _element: element,
              ccw_rotation: pour.rotation,
            },
          ]
        }
        case "polygon": {
          return [
            {
              _pcb_drawing_object_id: getNewPcbDrawingObjectId(
                "pcb_copper_pour_polygon",
              ),
              pcb_drawing_type: "polygon",
              points: pour.points,
              layer: pour.layer,
              _element: element,
            },
          ]
        }
      }
      return []
    }

    case "pcb_fabrication_note_text": {
      return [
        {
          _pcb_drawing_object_id: getNewPcbDrawingObjectId("text"),
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
    case "pcb_cutout": {
      const cutoutElement = element as any
      switch (cutoutElement.shape) {
        case "rect": {
          return [
            {
              _pcb_drawing_object_id:
                getNewPcbDrawingObjectId("pcb_cutout_rect"),
              pcb_drawing_type: "rect",
              x: cutoutElement.center.x,
              y: cutoutElement.center.y,
              w: cutoutElement.width,
              h: cutoutElement.height,
              layer: "drill",
              _element: element,
              _parent_pcb_component,
              _parent_source_component,
            },
          ]
        }
        case "circle": {
          return [
            {
              _pcb_drawing_object_id:
                getNewPcbDrawingObjectId("pcb_cutout_circle"),
              pcb_drawing_type: "circle",
              x: cutoutElement.center.x,
              y: cutoutElement.center.y,
              r: cutoutElement.radius,
              layer: "drill",
              _element: element,
              _parent_pcb_component,
              _parent_source_component,
            },
          ]
        }
        case "polygon": {
          return [
            {
              _pcb_drawing_object_id:
                getNewPcbDrawingObjectId("pcb_cutout_polygon"),
              pcb_drawing_type: "polygon",
              points: cutoutElement.points,
              layer: "drill",
              _element: element,
              _parent_pcb_component,
              _parent_source_component,
            },
          ]
        }
        default:
          console.warn(`Unsupported pcb_cutout shape: ${cutoutElement.shape}`)
          return []
      }
    }
  }

  // console.warn(`Unsupported element type: ${element.type}`)
  return []
}
