import { lineAlphabet } from "../assets/alphabet"
import { getNewPcbDrawingObjectId } from "./convert-element-to-primitive"
import type { Line, Text } from "./types"

export const LETTER_HEIGHT_TO_WIDTH_RATIO = 0.6
export const LETTER_HEIGHT_TO_SPACE_RATIO = 0.2

export const getTextWidth = (text: Text): number => {
  if (text.text.length === 0) return 0
  const target_ink_height = text.size * 0.7
  const target_ink_width_char = target_ink_height * LETTER_HEIGHT_TO_WIDTH_RATIO
  const space_between_chars_ink =
    target_ink_height * LETTER_HEIGHT_TO_SPACE_RATIO
  return (
    text.text.length * target_ink_width_char +
    (text.text.length - 1) * space_between_chars_ink
  )
}

export const convertTextToLines = (text: Text): Line[] => {
  const target_ink_height = text.size * 0.7
  if (target_ink_height <= 0 || text.text.length === 0) return []

  const strokeWidth = target_ink_height / 12

  // Effective span for scaling the normalized 0-1 character centerlines
  const centerline_span_y = Math.max(0, target_ink_height - strokeWidth)
  const y_baseline_offset = strokeWidth / 2

  const target_ink_width_char = target_ink_height * LETTER_HEIGHT_TO_WIDTH_RATIO
  const centerline_span_x = Math.max(0, target_ink_width_char - strokeWidth)
  const x_char_start_offset = strokeWidth / 2

  const space_between_chars_ink =
    target_ink_height * LETTER_HEIGHT_TO_SPACE_RATIO

  const lines: Line[] = []
  let current_x_origin_for_char_ink_box = text.x

  for (let letterIndex = 0; letterIndex < text.text.length; letterIndex++) {
    const letter = text.text[letterIndex]
    const letterLines = lineAlphabet[letter.toUpperCase()]

    if (!letterLines) {
      current_x_origin_for_char_ink_box +=
        target_ink_width_char + space_between_chars_ink
      continue
    }

    for (const {
      x1: norm_x1,
      y1: norm_y1,
      x2: norm_x2,
      y2: norm_y2,
    } of letterLines) {
      lines.push({
        _pcb_drawing_object_id: getNewPcbDrawingObjectId("line"),
        pcb_drawing_type: "line",
        x1:
          current_x_origin_for_char_ink_box +
          x_char_start_offset +
          centerline_span_x * norm_x1,
        y1: text.y + y_baseline_offset + centerline_span_y * norm_y1,
        x2:
          current_x_origin_for_char_ink_box +
          x_char_start_offset +
          centerline_span_x * norm_x2,
        y2: text.y + y_baseline_offset + centerline_span_y * norm_y2,
        width: strokeWidth,
        layer: text.layer,
        unit: text.unit,
      })
    }
    current_x_origin_for_char_ink_box +=
      target_ink_width_char + space_between_chars_ink
  }

  return lines
}
