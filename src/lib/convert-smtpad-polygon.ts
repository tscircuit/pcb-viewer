import type { Primitive } from "./types"
import {
  getNewPcbDrawingObjectId,
  normalizePolygonPoints,
} from "./convert-element-to-primitive"

type MetaData = {
  _parent_pcb_component?: any
  _parent_source_component?: any
  _source_port?: any
}

export const convertSmtpadPolygon = (
  element: any,
  metadata: MetaData,
): (Primitive & MetaData)[] => {
  const { layer, points } = element
  const primitives = [
    {
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("polygon"),
      pcb_drawing_type: "polygon" as const,
      points: normalizePolygonPoints(points),
      layer: layer || "top",
      _element: element,
      _parent_pcb_component: metadata._parent_pcb_component,
      _parent_source_component: metadata._parent_source_component,
      _source_port: metadata._source_port,
    },
  ]

  // Add solder mask if enabled
  if (element.is_covered_with_solder_mask) {
    const maskLayer =
      layer === "bottom"
        ? "soldermask_with_copper_bottom"
        : "soldermask_with_copper_top"
    const maskPrimitive: any = {
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("polygon"),
      pcb_drawing_type: "polygon" as const,
      points: normalizePolygonPoints(points),
      layer: maskLayer,
      _element: element,
      _parent_pcb_component: metadata._parent_pcb_component,
      _parent_source_component: metadata._parent_source_component,
      _source_port: metadata._source_port,
    }
    if ((element as any).solder_mask_color) {
      maskPrimitive.color = (element as any).solder_mask_color
    }
    primitives.push(maskPrimitive)
  }

  return primitives
}
