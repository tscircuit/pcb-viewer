import type { AnyCircuitElement, PcbSmtPadRotatedPill } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
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

const parseLengthValue = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = parseFloat(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return fallback
}

const createDimensionPrimitives = ({
  element,
  layer,
  from,
  to,
  meta,
  offset,
}: {
  element: any
  layer: string
  from: { x: number; y: number }
  to: { x: number; y: number }
  meta: MetaData & { _element: AnyCircuitElement }
  offset?: unknown
}): (Primitive & MetaData)[] => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)

  if (!Number.isFinite(length) || length === 0) return []

  const unitVector = { x: dx / length, y: dy / length }
  const perpendicular = { x: -unitVector.y, y: unitVector.x }

  const arrowSizeFallback = Math.max(length * 0.05, 0.5)
  const arrowSize = Math.min(
    parseLengthValue(element.arrow_size, arrowSizeFallback),
    length / 2,
  )
  const arrowWidth = Math.max(arrowSize * 0.6, arrowSize * 0.3)

  const lineWidth = Math.max(arrowSize / 5, 0.05)

  const offsetDistance = parseLengthValue(offset ?? element.offset, 0)
  const offsetVector = {
    x: perpendicular.x * offsetDistance,
    y: perpendicular.y * offsetDistance,
  }

  const startPoint = {
    x: from.x + offsetVector.x,
    y: from.y + offsetVector.y,
  }
  const endPoint = {
    x: to.x + offsetVector.x,
    y: to.y + offsetVector.y,
  }

  const primitives: (Primitive & MetaData)[] = []

  if (offsetDistance !== 0) {
    primitives.push({
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("line"),
      pcb_drawing_type: "line",
      x1: from.x,
      y1: from.y,
      x2: startPoint.x,
      y2: startPoint.y,
      width: lineWidth,
      layer,
      ...meta,
    })
    primitives.push({
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("line"),
      pcb_drawing_type: "line",
      x1: to.x,
      y1: to.y,
      x2: endPoint.x,
      y2: endPoint.y,
      width: lineWidth,
      layer,
      ...meta,
    })
  }

  primitives.push({
    _pcb_drawing_object_id: getNewPcbDrawingObjectId("line"),
    pcb_drawing_type: "line",
    x1: startPoint.x,
    y1: startPoint.y,
    x2: endPoint.x,
    y2: endPoint.y,
    width: lineWidth,
    layer,
    ...meta,
  })

  const addArrow = (tip: { x: number; y: number }, direction: 1 | -1) => {
    const base = {
      x: tip.x + unitVector.x * arrowSize * direction,
      y: tip.y + unitVector.y * arrowSize * direction,
    }
    const left = {
      x: base.x + perpendicular.x * arrowWidth,
      y: base.y + perpendicular.y * arrowWidth,
    }
    const right = {
      x: base.x - perpendicular.x * arrowWidth,
      y: base.y - perpendicular.y * arrowWidth,
    }

    primitives.push({
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("line"),
      pcb_drawing_type: "line",
      x1: tip.x,
      y1: tip.y,
      x2: left.x,
      y2: left.y,
      width: lineWidth,
      layer,
      ...meta,
    })

    primitives.push({
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("line"),
      pcb_drawing_type: "line",
      x1: tip.x,
      y1: tip.y,
      x2: right.x,
      y2: right.y,
      width: lineWidth,
      layer,
      ...meta,
    })
  }

  addArrow(startPoint, 1)
  addArrow(endPoint, -1)

  const fontSize = parseLengthValue(element.font_size, 1)
  const text =
    typeof element.text === "string" && element.text.trim().length > 0
      ? element.text
      : `${length.toFixed(2)}mm`

  if (text) {
    const baseMidPoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2,
    }

    const offsetDirection = offsetDistance >= 0 ? 1 : -1
    const textDistanceFromLine = Math.max(fontSize, arrowSize) * 0.6

    const textPosition = {
      x:
        baseMidPoint.x +
        perpendicular.x * textDistanceFromLine * offsetDirection,
      y:
        baseMidPoint.y +
        perpendicular.y * textDistanceFromLine * offsetDirection,
    }

    let rotation = (Math.atan2(dy, dx) * 180) / Math.PI
    if (rotation > 180) rotation -= 360
    if (rotation > 90) rotation -= 180
    if (rotation < -90) rotation += 180

    primitives.push({
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("text"),
      pcb_drawing_type: "text",
      text,
      x: textPosition.x,
      y: textPosition.y,
      size: fontSize,
      layer,
      align: "center",
      ccw_rotation: rotation,
      ...meta,
    })
  }

  const colorValue =
    typeof element.color === "string" ? element.color.trim() : ""

  if (colorValue) {
    for (const primitive of primitives) {
      primitive.color = colorValue
    }
  }

  return primitives
}

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

  const dimensionType = (element as any).type

  if (dimensionType === "pcb_note_dimension") {
    const noteDimension = element as any
    const fromPoint = noteDimension.from
    const toPoint = noteDimension.to

    if (
      !fromPoint ||
      !toPoint ||
      typeof fromPoint.x !== "number" ||
      typeof fromPoint.y !== "number" ||
      typeof toPoint.x !== "number" ||
      typeof toPoint.y !== "number"
    ) {
      return []
    }

    return createDimensionPrimitives({
      element: noteDimension,
      layer: "other",
      from: fromPoint,
      to: toPoint,
      meta: {
        _element: element,
        _parent_pcb_component,
        _parent_source_component,
        _source_port,
      },
    })
  }

  if (dimensionType === "pcb_fabrication_note_dimension") {
    const fabricationDimension = element as any

    const resolvePoint = (value: any) => {
      if (!value) return null
      if (typeof value === "string") return null
      if (typeof value === "object" && "x" in value && "y" in value) {
        return value as { x: number; y: number }
      }
      return null
    }

    const fromPoint = resolvePoint(fabricationDimension.from)
    const toPoint = resolvePoint(fabricationDimension.to)

    if (!fromPoint || !toPoint) return []

    const layer =
      fabricationDimension.layer === "bottom"
        ? "bottom_fabrication"
        : "top_fabrication"

    return createDimensionPrimitives({
      element: fabricationDimension,
      layer,
      from: fromPoint,
      to: toPoint,
      offset: fabricationDimension.offset,
      meta: {
        _element: element,
        _parent_pcb_component,
        _parent_source_component,
        _source_port,
      },
    })
  }

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
        const { shape, x, y, width, height, layer, rect_border_radius } =
          element

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
      } else if (element.shape === "polygon") {
        const { layer, points } = element
        return [
          {
            _pcb_drawing_object_id: `polygon_${globalPcbDrawingObjectCount++}`,
            pcb_drawing_type: "polygon",
            points,
            layer: layer || "top",
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            _source_port,
          },
        ]
      } else if (element.shape === "pill" || element.shape === "rotated_pill") {
        const { x, y, width, height, layer } = element
        return [
          {
            _pcb_drawing_object_id: `pill_${globalPcbDrawingObjectCount++}`,
            pcb_drawing_type: "pill",
            x,
            y,
            w: width,
            h: height,
            layer: layer || "top",
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
            _source_port,
            ccw_rotation: (element as PcbSmtPadRotatedPill).ccw_rotation,
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
            ccw_rotation: element.ccw_rotation,
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
            ccw_rotation: element.ccw_rotation,
          },
        ]
      } else if (element.shape === "circular_hole_with_rect_pad") {
        const {
          x,
          y,
          hole_diameter,
          rect_pad_width,
          rect_pad_height,
          rect_border_radius,
        } = element
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
          rect_border_radius,
        } = element

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
          rect_border_radius,
        } = element as any // Use as any to access new properties

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
              points: points,
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

    case "pcb_note_line": {
      const noteLineElement = element as any
      return [
        {
          _pcb_drawing_object_id: getNewPcbDrawingObjectId("pcb_note_line"),
          pcb_drawing_type: "line",
          x1: noteLineElement.x1,
          y1: noteLineElement.y1,
          x2: noteLineElement.x2,
          y2: noteLineElement.y2,
          width: noteLineElement.stroke_width ?? 0.1,
          squareCap: false,
          layer: "notes",
          _element: element,
          _parent_pcb_component,
          _parent_source_component,
        },
      ]
    }

    case "pcb_note_rect": {
      const noteRectElement = element as any
      return [
        {
          _pcb_drawing_object_id: getNewPcbDrawingObjectId("pcb_note_rect"),
          pcb_drawing_type: "rect",
          x: noteRectElement.center.x,
          y: noteRectElement.center.y,
          w: noteRectElement.width,
          h: noteRectElement.height,
          layer: "notes",
          stroke_width: noteRectElement.stroke_width,
          is_filled: noteRectElement.is_filled,
          has_stroke: noteRectElement.has_stroke,
          is_stroke_dashed: noteRectElement.is_stroke_dashed,
          _element: element,
          _parent_pcb_component,
          _parent_source_component,
        },
      ]
    }

    case "pcb_note_path": {
      const notePathElement = element as any
      const { route, stroke_width } = notePathElement

      return route
        .slice(0, -1)
        .map((point: any, index: number) => {
          const nextPoint = route[index + 1]
          return {
            _pcb_drawing_object_id: getNewPcbDrawingObjectId("pcb_note_path"),
            pcb_drawing_type: "line",
            x1: point.x,
            y1: point.y,
            x2: nextPoint.x,
            y2: nextPoint.y,
            width: stroke_width ?? 0.1,
            squareCap: false,
            layer: "notes",
            _element: element,
            _parent_pcb_component,
            _parent_source_component,
          } as Primitive & MetaData
        })
        .filter(Boolean)
    }

    case "pcb_note_text": {
      const noteTextElement = element as any
      return [
        {
          _pcb_drawing_object_id: getNewPcbDrawingObjectId("pcb_note_text"),
          pcb_drawing_type: "text",
          x: noteTextElement.anchor_position.x,
          y: noteTextElement.anchor_position.y,
          layer: "notes",
          align: noteTextElement.anchor_alignment ?? "center",
          text: noteTextElement.text,
          size: noteTextElement.font_size,
          _element: element,
          _parent_pcb_component,
          _parent_source_component,
        },
      ]
    }

    case "pcb_note_dimension": {
      const dimensionElement = element as any
      const { from, to, text, font_size, arrow_size } = dimensionElement
      const primitives: Primitive[] = []

      // Main line connecting from and to points
      primitives.push({
        _pcb_drawing_object_id: getNewPcbDrawingObjectId("pcb_note_dimension"),
        pcb_drawing_type: "line",
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        width: 0.05,
        squareCap: false,
        layer: "notes",
        _element: element,
        _parent_pcb_component,
        _parent_source_component,
      })

      // Calculate arrow direction
      const dx = to.x - from.x
      const dy = to.y - from.y
      const length = Math.sqrt(dx * dx + dy * dy)
      const unitX = dx / length
      const unitY = dy / length

      // Arrow at 'from' point
      const arrowAngle = Math.PI / 6 // 30 degrees
      const arrow1X1 =
        from.x +
        arrow_size *
          (unitX * Math.cos(arrowAngle) - unitY * Math.sin(arrowAngle))
      const arrow1Y1 =
        from.y +
        arrow_size *
          (unitX * Math.sin(arrowAngle) + unitY * Math.cos(arrowAngle))
      const arrow1X2 =
        from.x +
        arrow_size *
          (unitX * Math.cos(-arrowAngle) - unitY * Math.sin(-arrowAngle))
      const arrow1Y2 =
        from.y +
        arrow_size *
          (unitX * Math.sin(-arrowAngle) + unitY * Math.cos(-arrowAngle))

      primitives.push({
        _pcb_drawing_object_id: getNewPcbDrawingObjectId("pcb_note_dimension"),
        pcb_drawing_type: "line",
        x1: from.x,
        y1: from.y,
        x2: arrow1X1,
        y2: arrow1Y1,
        width: 0.05,
        squareCap: false,
        layer: "notes",
        _element: element,
      })

      primitives.push({
        _pcb_drawing_object_id: getNewPcbDrawingObjectId("pcb_note_dimension"),
        pcb_drawing_type: "line",
        x1: from.x,
        y1: from.y,
        x2: arrow1X2,
        y2: arrow1Y2,
        width: 0.05,
        squareCap: false,
        layer: "notes",
        _element: element,
      })

      // Arrow at 'to' point (pointing in opposite direction)
      const arrow2X1 =
        to.x -
        arrow_size *
          (unitX * Math.cos(arrowAngle) - unitY * Math.sin(arrowAngle))
      const arrow2Y1 =
        to.y -
        arrow_size *
          (unitX * Math.sin(arrowAngle) + unitY * Math.cos(arrowAngle))
      const arrow2X2 =
        to.x -
        arrow_size *
          (unitX * Math.cos(-arrowAngle) - unitY * Math.sin(-arrowAngle))
      const arrow2Y2 =
        to.y -
        arrow_size *
          (unitX * Math.sin(-arrowAngle) + unitY * Math.cos(-arrowAngle))

      primitives.push({
        _pcb_drawing_object_id: getNewPcbDrawingObjectId("pcb_note_dimension"),
        pcb_drawing_type: "line",
        x1: to.x,
        y1: to.y,
        x2: arrow2X1,
        y2: arrow2Y1,
        width: 0.05,
        squareCap: false,
        layer: "notes",
        _element: element,
      })

      primitives.push({
        _pcb_drawing_object_id: getNewPcbDrawingObjectId("pcb_note_dimension"),
        pcb_drawing_type: "line",
        x1: to.x,
        y1: to.y,
        x2: arrow2X2,
        y2: arrow2Y2,
        width: 0.05,
        squareCap: false,
        layer: "notes",
        _element: element,
      })

      // Text label in the middle if provided
      if (text) {
        primitives.push({
          _pcb_drawing_object_id:
            getNewPcbDrawingObjectId("pcb_note_dimension"),
          pcb_drawing_type: "text",
          x: (from.x + to.x) / 2,
          y: (from.y + to.y) / 2,
          layer: "notes",
          align: "center",
          text,
          size: font_size,
          _element: element,
        })
      }

      return primitives
    }
  }

  // console.warn(`Unsupported element type: ${element.type}`)
  return []
}
