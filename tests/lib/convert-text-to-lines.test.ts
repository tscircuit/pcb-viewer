import { describe, expect, it } from "bun:test"
import { lineAlphabet } from "../../src/assets/alphabet"
import {
  LETTER_HEIGHT_TO_SPACE_RATIO,
  LETTER_HEIGHT_TO_WIDTH_RATIO,
  convertTextToLines,
  getTextMetrics,
} from "../../src/lib/convert-text-to-lines"
import type { Text } from "../../src/lib/types"

describe("convertTextToLines", () => {
  it("supports multi-line text while preserving baseline alignment", () => {
    const text: Text = {
      _pcb_drawing_object_id: "text_0",
      pcb_drawing_type: "text",
      text: "A\nBC",
      x: 0,
      y: 0,
      size: 10,
      layer: "top_silkscreen",
    }

    const metrics = getTextMetrics(text)
    const expectedTargetHeight = text.size * 0.7
    const expectedCharWidth =
      expectedTargetHeight * LETTER_HEIGHT_TO_WIDTH_RATIO
    const expectedSpacing = expectedTargetHeight * LETTER_HEIGHT_TO_SPACE_RATIO
    const expectedWidth = Math.max(
      expectedCharWidth,
      expectedCharWidth * 2 + expectedSpacing,
    )
    const expectedHeight = expectedTargetHeight * 2 + expectedSpacing

    expect(metrics.width).toBeCloseTo(expectedWidth)
    expect(metrics.height).toBeCloseTo(expectedHeight)
    expect(metrics.lineCount).toBe(2)

    const lines = convertTextToLines(text)
    const yValues = lines.flatMap((line) => [line.y1, line.y2])

    const getLineGlyphBounds = (lineText: string) => {
      const bounds = { minY: Infinity, maxY: -Infinity }

      for (const letter of lineText) {
        const letterLines =
          lineAlphabet[letter] ?? lineAlphabet[letter.toUpperCase()]
        if (!letterLines) continue

        for (const { y1, y2 } of letterLines) {
          bounds.minY = Math.min(bounds.minY, y1, y2)
          bounds.maxY = Math.max(bounds.maxY, y1, y2)
        }
      }

      if (!Number.isFinite(bounds.minY)) {
        return { minY: 0, maxY: 0 }
      }

      return bounds
    }

    // First line (top) should be at text.y, second line should be below (lower Y)
    // With 2 lines, total offset is (lineCount - 1) * (height + spacing)
    const totalOffset = expectedTargetHeight + expectedSpacing

    const firstLineBounds = getLineGlyphBounds("A")
    const secondLineBounds = getLineGlyphBounds("BC")

    // Maximum Y should align with the top of the first line glyphs
    const maxY = Math.max(...yValues)
    expect(maxY).toBeCloseTo(
      text.y + expectedTargetHeight * firstLineBounds.maxY,
    )

    // Minimum Y should align with the bottom of the last line glyphs
    const minY = Math.min(...yValues)
    expect(minY).toBeCloseTo(
      text.y - totalOffset + expectedTargetHeight * secondLineBounds.minY,
    )
  })
})
