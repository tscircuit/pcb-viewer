import { lineAlphabet } from "../assets/alphabet"
import { Line, Text } from "./types"

export const convertTextToLines = (text: Text): Line[] => {
  const strokeWidth = text.size / 8
  const letterWidth = text.size * 0.6
  const letterSpace = text.size * 0.2

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
