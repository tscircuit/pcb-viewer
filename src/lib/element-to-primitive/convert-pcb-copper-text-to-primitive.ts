import type { AnyCircuitElement } from "circuit-json"
import { distance } from "circuit-json"
import type { Primitive } from "../types"
import { getNewPcbDrawingObjectId } from "../convert-element-to-primitive"

type MetaData = {
  _parent_pcb_component?: any
  _parent_source_component?: any
  _source_port?: any
}

export const convertPcbCopperTextToPrimitive = (
  element: AnyCircuitElement,
  metadata: MetaData,
): (Primitive & MetaData)[] => {
  const { _parent_pcb_component, _parent_source_component } = metadata
  const copperText = element as any

  const fontSize =
    typeof copperText.font_size === "string"
      ? distance.parse(copperText.font_size)
      : (copperText.font_size ?? 0.2)

  // Parse knockout padding if provided
  let knockoutPadding:
    | {
        left: number
        top: number
        bottom: number
        right: number
      }
    | undefined
  if (copperText.knockout_padding) {
    knockoutPadding = {
      left:
        typeof copperText.knockout_padding.left === "string"
          ? distance.parse(copperText.knockout_padding.left)
          : copperText.knockout_padding.left,
      top:
        typeof copperText.knockout_padding.top === "string"
          ? distance.parse(copperText.knockout_padding.top)
          : copperText.knockout_padding.top,
      bottom:
        typeof copperText.knockout_padding.bottom === "string"
          ? distance.parse(copperText.knockout_padding.bottom)
          : copperText.knockout_padding.bottom,
      right:
        typeof copperText.knockout_padding.right === "string"
          ? distance.parse(copperText.knockout_padding.right)
          : copperText.knockout_padding.right,
    }
  }

  return [
    {
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("text"),
      pcb_drawing_type: "text",
      x: copperText.anchor_position.x,
      y: copperText.anchor_position.y,
      layer: copperText.layer, // "top", "bottom", or inner layers
      align: copperText.anchor_alignment ?? "center",
      text: copperText.text,
      size: fontSize,
      ccw_rotation: copperText.ccw_rotation,
      is_mirrored: copperText.is_mirrored,
      is_knockout: copperText.is_knockout,
      knockout_padding: knockoutPadding,
      _element: element,
      _parent_pcb_component,
      _parent_source_component,
    },
  ]
}
