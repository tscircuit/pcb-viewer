import type {
  AnyCircuitElement,
  PcbNoteLine,
  PcbNoteRect,
  PcbNotePath,
  PcbNoteText,
  PcbNoteDimension,
  PcbSmtPadRotatedPill,
  PcbPanel,
  PcbHole,
  PcbHoleRotatedPill,
  PcbCutoutRect,
  PcbCutoutCircle,
  PcbCutoutPolygon,
} from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import type { Primitive } from "./types"
import { type Point, getExpandedStroke } from "./util/expand-stroke"
import { distance } from "circuit-json"
import { convertSmtpadRect } from "./element-to-primitive-converters/convert-smtpad-rect"
import { convertSmtpadCircle } from "./element-to-primitive-converters/convert-smtpad-circle"
import { convertSmtpadPolygon } from "./element-to-primitive-converters/convert-smtpad-polygon"
import {
  convertSmtpadPill,
  convertSmtpadRotatedPill,
} from "./element-to-primitive-converters/convert-smtpad-pill"
import { convertPcbCopperTextToPrimitive } from "./element-to-primitive/convert-pcb-copper-text-to-primitive"

type MetaData = {
  _parent_pcb_component?: any
  _parent_source_component?: any
  _source_port?: any
}

let globalPcbDrawingObjectCount = 0

export const getNewPcbDrawingObjectId = (prefix: string) =>
  `${prefix}_${globalPcbDrawingObjectCount++}`

export const normalizePolygonPoints = (points: Point[] | undefined) =>
  (points ?? []).map((point) => ({
    x: distance.parse(point.x),
    y: distance.parse(point.y),
  }))

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
    case "pcb_panel": {
      const { width, height, center } = element as PcbPanel
      const cx = center?.x ?? 0
      const cy = center?.y ?? 0
      return [
        // Bottom line
        {
          _pcb_drawing_object_id: `line_${globalPcbDrawingObjectCount++}`,
          pcb_drawing_type: "line",
          x1: cx - width / 2,
          y1: cy - height / 2,
          x2: cx + width / 2,
          y2: cy - height / 2,
          width: 1,
          zoomIndependent: true,
          layer: "board",
          _element: element,
        },
        // Top line
        {
          _pcb_drawing_object_id: `line_${globalPcbDrawingObjectCount++}`,
          pcb_drawing_type: "line",
          x1: cx - width / 2,
          y1: cy + height / 2,
          x2: cx + width / 2,
          y2: cy + height / 2,
          width: 1,
          zoomIndependent: true,
          layer: "board",
          _element: element,
        },
        // Left line
        {
          _pcb_drawing_object_id: `line_${globalPcbDrawingObjectCount++}`,
          pcb_drawing_type: "line",
          x1: cx - width / 2,
          y1: cy - height / 2,
          x2: cx - width / 2,
          y2: cy + height / 2,
          width: 1,
          zoomIndependent: true,
          layer: "board",
          _element: element,
        },
        // Right line
        {
          _pcb_drawing_object_id: `line_${globalPcbDrawingObjectCount++}`,
          pcb_drawing_type: "line",
          x1: cx + width / 2,
          y1: cy - height / 2,
          x2: cx + width / 2,
          y2: cy + height / 2,
          width: 1,
          zoomIndependent: true,
          layer: "board",
          _element: element,
        },
      ]
    }

    case "pcb_smtpad": {
      const metadata: MetaData = {
        _parent_pcb_component,
        _parent_source_component,
        _source_port,
      }

      if (element.shape === "rect" || element.shape === "rotated_rect") {
        return convertSmtpadRect(element, metadata)
      } else if (element.shape === "circle") {
        return convertSmtpadCircle(element, metadata)
      } else if (element.shape === "polygon") {
        return convertSmtpadPolygon(element, metadata)
      } else if (element.shape === "pill") {
        return convertSmtpadPill(element, metadata)
      } else if (element.shape === "rotated_pill") {
        return convertSmtpadRotatedPill(element, metadata)
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
      } else if (
        element.hole_shape === "pill" ||
        element.hole_shape === "rotated_pill"
      ) {
        const { x, y, hole_width, hole_height } = element

        if (typeof hole_width !== "number" || typeof hole_height !== "number") {
          return []
        }

        return [
          {
            _pcb_drawing_object_id: `pill_${globalPcbDrawingObjectCount++}`,
            pcb_drawing_type: "pill",
            x,
            y,
            w: hole_width,
            h: hole_height,
            layer: "drill",
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            ccw_rotation: (element as PcbHoleRotatedPill).ccw_rotation,
          },
        ]
      } else if (element.hole_shape === "rect") {
        const { x, y, hole_width, hole_height } = element

        if (typeof hole_width !== "number" || typeof hole_height !== "number") {
          return []
        }

        return [
          {
            _pcb_drawing_object_id: `rect_${globalPcbDrawingObjectCount++}`,
            pcb_drawing_type: "rect",
            x,
            y,
            w: hole_width,
            h: hole_height,
            layer: "drill",
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
          },
        ]
      }
      // TODO oval hole
      return []
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
      const { x, y, outer_diameter, hole_diameter } = element
      const from_layer = element.from_layer
      const to_layer = element.to_layer
      const layers = element.layers

      // Support both old format (from_layer/to_layer) and new format (layers array)
      const copperLayers: string[] = []
      if (from_layer && to_layer) {
        copperLayers.push(from_layer, to_layer)
      } else if (layers && Array.isArray(layers)) {
        copperLayers.push(...layers)
      } else {
        // Default to top and bottom if no layer info
        copperLayers.push("top", "bottom")
      }

      // Create the outer copper circles on the via layers
      // and the inner drill hole, similar to how pcb_plated_hole works
      const primitives: Primitive[] = []

      // Add outer copper circles for each layer
      for (const layer of copperLayers) {
        primitives.push({
          _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
          pcb_drawing_type: "circle",
          x,
          y,
          r: outer_diameter / 2,
          layer,
          _element: element,
          _parent_pcb_component,
          _parent_source_component,
        })
      }

      // Add inner drill hole (drawn on top due to layer order)
      primitives.push({
        _pcb_drawing_object_id: `circle_${globalPcbDrawingObjectCount++}`,
        pcb_drawing_type: "circle",
        x,
        y,
        r: hole_diameter / 2,
        layer: "drill",
        _element: element,
      })

      return primitives
    }

    case "pcb_copper_text": {
      return convertPcbCopperTextToPrimitive(element, {
        _parent_pcb_component,
        _parent_source_component,
      })
    }
    case "pcb_copper_pour": {
      const pour = element as any

      switch (pour.shape) {
        case "rect": {
          const { center, width, height, layer, rotation } = pour
          return [
            {
              _pcb_drawing_object_id: getNewPcbDrawingObjectId(
                "pcb_copper_pour_rect",
              ),
              pcb_drawing_type: "rect",
              x: center.x,
              y: center.y,
              w: width,
              h: height,
              layer: layer,
              _element: element,
              ccw_rotation: rotation,
            },
          ]
        }
        case "polygon": {
          const { points, layer } = pour
          return [
            {
              _pcb_drawing_object_id: getNewPcbDrawingObjectId(
                "pcb_copper_pour_polygon",
              ),
              pcb_drawing_type: "polygon",
              points: normalizePolygonPoints(points),
              layer: layer,
              _element: element,
            },
          ]
        }
        case "brep": {
          const { brep_shape, layer } = pour
          return [
            {
              _pcb_drawing_object_id: getNewPcbDrawingObjectId(
                "pcb_copper_pour_brep",
              ),
              pcb_drawing_type: "polygon_with_arcs",
              brep_shape: brep_shape,
              layer: layer,
              _element: element,
            },
          ]
        }
      }
      return []
    }
    case "pcb_cutout": {
      switch (element.shape) {
        case "rect": {
          const cutoutElement = element as PcbCutoutRect
          const corner_radius = cutoutElement.corner_radius
          const ccw_rotation = cutoutElement.rotation ?? cutoutElement.rotation

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
              roundness: corner_radius,
              ccw_rotation,
              _element: element,
              _parent_pcb_component,
              _parent_source_component,
            },
          ]
        }
        case "circle": {
          const cutoutElement = element as PcbCutoutCircle

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
          const cutoutElement = element as PcbCutoutPolygon

          return [
            {
              _pcb_drawing_object_id:
                getNewPcbDrawingObjectId("pcb_cutout_polygon"),
              pcb_drawing_type: "polygon",
              points: normalizePolygonPoints(cutoutElement.points),
              layer: "drill",
              _element: element,
              _parent_pcb_component,
              _parent_source_component,
            },
          ]
        }
        default:
          console.warn(`Unsupported pcb_cutout shape: ${element.shape}`)
          return []
      }
    }
  }

  return []
}
