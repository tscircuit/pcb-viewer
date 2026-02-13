import type { AnyCircuitElement } from "circuit-json"
import { distance } from "circuit-json"
import type { PcbSilkscreenText } from "circuit-json"
import type { Primitive } from "../types"
import { getNewPcbDrawingObjectId } from "../convert-element-to-primitive"

type MetaData = {
  _parent_pcb_component?: any
  _parent_source_component?: any
  _source_port?: any
}

export const convertPcbSilkscreenTextToPrimitive = (
  element: AnyCircuitElement,
  metadata: MetaData,
): (Primitive & MetaData)[] => {
  const { _parent_pcb_component, _parent_source_component } = metadata
  const silkscreenText = element as PcbSilkscreenText

  const fontSize =
    typeof silkscreenText.font_size === "string"
      ? distance.parse(silkscreenText.font_size)
      : (silkscreenText.font_size ?? 0.2)

  // Parse knockout padding if provided
  let knockoutPadding:
    | {
        left: number
        top: number
        bottom: number
        right: number
      }
    | undefined
  if (silkscreenText.knockout_padding) {
    knockoutPadding = {
      left:
        typeof silkscreenText.knockout_padding.left === "string"
          ? distance.parse(silkscreenText.knockout_padding.left)
          : silkscreenText.knockout_padding.left,
      top:
        typeof silkscreenText.knockout_padding.top === "string"
          ? distance.parse(silkscreenText.knockout_padding.top)
          : silkscreenText.knockout_padding.top,
      bottom:
        typeof silkscreenText.knockout_padding.bottom === "string"
          ? distance.parse(silkscreenText.knockout_padding.bottom)
          : silkscreenText.knockout_padding.bottom,
      right:
        typeof silkscreenText.knockout_padding.right === "string"
          ? distance.parse(silkscreenText.knockout_padding.right)
          : silkscreenText.knockout_padding.right,
    }
  }

  return [
    {
      _pcb_drawing_object_id: getNewPcbDrawingObjectId("text"),
      pcb_drawing_type: "text",
      x: silkscreenText.anchor_position.x,
      y: silkscreenText.anchor_position.y,
      layer: silkscreenText.layer, // "top", "bottom"
      align: silkscreenText.anchor_alignment ?? "center",
      text: silkscreenText.text,
      size: fontSize,
      ccw_rotation: silkscreenText.ccw_rotation,
      is_mirrored: silkscreenText.is_mirrored,
      is_knockout: silkscreenText.is_knockout,
      knockout_padding: knockoutPadding,
      _element: element,
      _parent_pcb_component,
      _parent_source_component,
    },
  ]
}
