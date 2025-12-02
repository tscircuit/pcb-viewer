import { lineAlphabet } from "../assets/alphabet"
import { getNewPcbDrawingObjectId } from "./convert-element-to-primitive"
import type { Line, Text } from "./types"

export const LETTER_HEIGHT_TO_WIDTH_RATIO = 0.6
export const LETTER_HEIGHT_TO_SPACE_RATIO = 0.2

const LOWERCASE_BASELINE_OFFSET = (() => {
  const referenceLetters = ["a", "c", "e", "m", "n", "o", "r", "s", "u", "x"]

  const offsets = referenceLetters
    .map((letter) => lineAlphabet[letter])
    .filter((lines) => lines && lines.length > 0)
    .map((lines) =>
      Math.min(...lines.map((line) => Math.min(line.y1, line.y2))),
    )

  return offsets.length > 0 ? Math.min(...offsets) : 0
})()

const getBaselineOffsetForLetter = (letter: string) =>
  letter >= "a" && letter <= "z" ? LOWERCASE_BASELINE_OFFSET : 0

const getTextGeometry = (text: Text) => {
  const target_height = text.size * 0.7 // Apply 70% scaling

  const target_width_char = target_height * LETTER_HEIGHT_TO_WIDTH_RATIO
  const space_between_chars = target_height * LETTER_HEIGHT_TO_SPACE_RATIO
  const space_between_lines = target_height * LETTER_HEIGHT_TO_SPACE_RATIO

  const text_lines = text.text.split(/\r?\n/)
  const has_text = text.text.length > 0 && target_height > 0
  const line_count = has_text ? text_lines.length : 0

  const line_widths = has_text
    ? text_lines.map((line) => {
        if (line.length === 0) return 0
        return (
          line.length * target_width_char +
          (line.length - 1) * space_between_chars
        )
      })
    : []

  const width = line_widths.length > 0 ? Math.max(...line_widths) : 0
  const hasLowercase = /[a-z]/.test(text.text)
  const baselineOffset = hasLowercase
    ? LOWERCASE_BASELINE_OFFSET * target_height
    : 0

  const height =
    line_count > 0
      ? line_count * target_height +
        (line_count - 1) * space_between_lines +
        baselineOffset
      : 0

  return {
    text_lines,
    line_count,
    target_height,
    target_width_char,
    space_between_chars,
    space_between_lines,
    width,
    height,
  }
}

export const getTextWidth = (text: Text): number => getTextGeometry(text).width

export const getTextMetrics = (text: Text) => {
  const geometry = getTextGeometry(text)

  return {
    width: geometry.width,
    height: geometry.height,
    lineHeight: geometry.target_height,
    lineSpacing: geometry.space_between_lines,
    lineCount: geometry.line_count,
  }
}

export const convertTextToLines = (text: Text): Line[] => {
  const {
    text_lines,
    line_count,
    target_height,
    target_width_char,
    space_between_chars,
    space_between_lines,
  } = getTextGeometry(text)

  if (target_height <= 0 || line_count === 0) return []

  const strokeWidth = target_height / 12

  const lines: Line[] = []

  for (let lineIndex = 0; lineIndex < line_count; lineIndex++) {
    const lineYOffset = lineIndex * (target_height + space_between_lines)
    let current_x_origin_for_char_box = text.x

    for (
      let letterIndex = 0;
      letterIndex < text_lines[lineIndex].length;
      letterIndex++
    ) {
      const letter = text_lines[lineIndex][letterIndex]
      const letterLines =
        lineAlphabet[letter] ?? lineAlphabet[letter.toUpperCase()]
      const baselineOffset = getBaselineOffsetForLetter(letter)

      if (!letterLines) {
        current_x_origin_for_char_box += target_width_char + space_between_chars
        continue
      }

      for (const {
        x1: norm_x1,
        y1: norm_y1,
        x2: norm_x2,
        y2: norm_y2,
      } of letterLines) {
        const adjusted_y1 = norm_y1 - baselineOffset
        const adjusted_y2 = norm_y2 - baselineOffset
        lines.push({
          _pcb_drawing_object_id: getNewPcbDrawingObjectId("line"),
          pcb_drawing_type: "line",
          x1: current_x_origin_for_char_box + target_width_char * norm_x1,
          y1: text.y + lineYOffset + target_height * adjusted_y1,
          x2: current_x_origin_for_char_box + target_width_char * norm_x2,
          y2: text.y + lineYOffset + target_height * adjusted_y2,
          width: strokeWidth,
          layer: text.layer,
          unit: text.unit,
          color: text.color,
        })
      }
      current_x_origin_for_char_box += target_width_char + space_between_chars
    }
  }

  return lines
}
