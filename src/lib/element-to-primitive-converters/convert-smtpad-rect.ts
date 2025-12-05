import type { PcbSmtPadRect, PcbSmtPadRotatedRect } from "circuit-json"
import type { Primitive } from "../types"
import { getNewPcbDrawingObjectId } from "../convert-element-to-primitive"

type MetaData = {
  _parent_pcb_component?: any
  _parent_source_component?: any
  _source_port?: any
}

export const convertSmtpadRect = (
  element: PcbSmtPadRect | PcbSmtPadRotatedRect,
  metadata: MetaData,
): (Primitive & MetaData)[] => {
  const { x, y, width, height, layer, rect_border_radius } = element
  const corner_radius = element.corner_radius ?? rect_border_radius ?? 0

  const primitives: (Primitive & MetaData)[] = [
    {
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("rect"),
      pcb_drawing_type: "rect" as const,
      x,
      y,
      w: width,
      h: height,
      layer: layer || "top",
      _element: element,
      _parent_pcb_component: metadata._parent_pcb_component,
      _parent_source_component: metadata._parent_source_component,
      _source_port: metadata._source_port,
      roundness: corner_radius,
      ...(element.shape === "rotated_rect" && element.ccw_rotation !== undefined
        ? { ccw_rotation: element.ccw_rotation }
        : {}),
    },
  ]

  // Add solder mask if enabled
  if (element.is_covered_with_solder_mask) {
    const maskLayer =
      layer === "bottom"
        ? "soldermask_with_copper_bottom"
        : "soldermask_with_copper_top"
    const maskPrimitiveBase: Primitive & MetaData = {
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("rect"),
      pcb_drawing_type: "rect" as const,
      x,
      y,
      w: width,
      h: height,
      layer: maskLayer,
      _element: element,
      _parent_pcb_component: metadata._parent_pcb_component,
      _parent_source_component: metadata._parent_source_component,
      _source_port: metadata._source_port,
      roundness: corner_radius,
      ...(element.shape === "rotated_rect" && element.ccw_rotation !== undefined
        ? { ccw_rotation: element.ccw_rotation }
        : {}),
    }
    const maskPrimitive: Primitive & MetaData = {
      ...maskPrimitiveBase,
      ...("solder_mask_color" in element && element.solder_mask_color
        ? { color: element.solder_mask_color as string }
        : {}),
    }
    primitives.push(maskPrimitive)
  }

  return primitives
}
