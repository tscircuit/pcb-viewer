import { lineAlphabet } from "../assets/alphabet"
import { Line, Text } from "./types"

export const LETTER_HEIGHT_TO_WIDTH_RATIO = 0.6
export const LETTER_HEIGHT_TO_SPACE_RATIO = 0.2

export const getTextWidth = (text: Text): number => {
  return (
    text.text.length * text.size * LETTER_HEIGHT_TO_WIDTH_RATIO +
    (text.text.length - 1) * text.size * LETTER_HEIGHT_TO_SPACE_RATIO
  )
}

export const convertTextToLines = (text: Text): Line[] => {
  const strokeWidth = text.size / 8
  const letterWidth = text.size * LETTER_HEIGHT_TO_WIDTH_RATIO
  const letterSpace = text.size * LETTER_HEIGHT_TO_SPACE_RATIO

  const lines: Line[] = []
  for (let letterIndex = 0; letterIndex < text.text.length; letterIndex++) {
    const letter = text.text[letterIndex]
    const letterLines = lineAlphabet[letter.toUpperCase()]
    if (!letterLines) continue
    for (const { x1, y1, x2, y2 } of letterLines) {
      lines.push({
        pcb_drawing_type: "line",
        x1:
          text.x + (letterWidth + letterSpace) * letterIndex + letterWidth * x1,
        y1: text.y + text.size * y1,
        x2:
          text.x + (letterWidth + letterSpace) * letterIndex + letterWidth * x2,
        y2: text.y + text.size * y2,
        width: strokeWidth,
        layer: text.layer,
        unit: text.unit,
      })
    }
  }

  return lines
}
