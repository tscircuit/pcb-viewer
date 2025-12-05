import type { PcbSmtPadPill, PcbSmtPadRotatedPill } from "circuit-json"
import type { Primitive } from "../types"
import { getNewPcbDrawingObjectId } from "../convert-element-to-primitive"

type MetaData = {
  _parent_pcb_component?: any
  _parent_source_component?: any
  _source_port?: any
}

export const convertSmtpadPill = (
  element: PcbSmtPadPill,
  metadata: MetaData,
): (Primitive & MetaData)[] => {
  const { x, y, width, height, layer } = element
  const primitives: (Primitive & MetaData)[] = [
    {
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("pill"),
      pcb_drawing_type: "pill" as const,
      x,
      y,
      w: width,
      h: height,
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
    const maskPrimitive: Primitive & MetaData = {
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("pill"),
      pcb_drawing_type: "pill" as const,
      x,
      y,
      w: width,
      h: height,
      layer: maskLayer,
      _element: element,
      _parent_pcb_component: metadata._parent_pcb_component,
      _parent_source_component: metadata._parent_source_component,
      _source_port: metadata._source_port,
      ...("solder_mask_color" in element && element.solder_mask_color
        ? { color: element.solder_mask_color }
        : {}),
    }
    primitives.push(maskPrimitive)
  }

  return primitives
}

export const convertSmtpadRotatedPill = (
  element: PcbSmtPadRotatedPill,
  metadata: MetaData,
): (Primitive & MetaData)[] => {
  const { x, y, width, height, layer, ccw_rotation } = element
  const primitives: (Primitive & MetaData)[] = [
    {
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("pill"),
      pcb_drawing_type: "pill" as const,
      x,
      y,
      w: width,
      h: height,
      layer: layer || "top",
      _element: element,
      _parent_pcb_component: metadata._parent_pcb_component,
      _parent_source_component: metadata._parent_source_component,
      _source_port: metadata._source_port,
      ccw_rotation,
    },
  ]

  // Add solder mask if enabled
  if (element.is_covered_with_solder_mask) {
    const maskLayer =
      layer === "bottom"
        ? "soldermask_with_copper_bottom"
        : "soldermask_with_copper_top"
    const maskPrimitive: Primitive & MetaData = {
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("pill"),
      pcb_drawing_type: "pill" as const,
      x,
      y,
      w: width,
      h: height,
      layer: maskLayer,
      _element: element,
      _parent_pcb_component: metadata._parent_pcb_component,
      _parent_source_component: metadata._parent_source_component,
      _source_port: metadata._source_port,
      ccw_rotation,
      ...("solder_mask_color" in element && element.solder_mask_color
        ? { color: element.solder_mask_color }
        : {}),
    }
    primitives.push(maskPrimitive)
  }

  return primitives
}
