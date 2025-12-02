import { describe, expect, it } from "bun:test"
import {
  LETTER_HEIGHT_TO_SPACE_RATIO,
  LETTER_HEIGHT_TO_WIDTH_RATIO,
  convertTextToLines,
  getTextMetrics,
} from "../../src/lib/convert-text-to-lines"
import type { Text } from "../../src/lib/types"
import { lineAlphabet } from "../../src/assets/alphabet"

const getLowercaseBaselineOffset = () => {
  const referenceLetters = ["a", "c", "e", "m", "n", "o", "r", "s", "u", "x"]

  const offsets = referenceLetters
    .map((letter) => lineAlphabet[letter])
    .filter((lines) => lines && lines.length > 0)
    .map((lines) =>
      Math.min(...lines.map((line) => Math.min(line.y1, line.y2))),
    )

  return offsets.length > 0 ? Math.min(...offsets) : 0
}

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

    const minY = Math.min(...yValues)
    expect(minY).toBeCloseTo(text.y)

    const secondLineYs = yValues.filter(
      (y) => y > expectedTargetHeight + expectedSpacing / 2,
    )
    const minSecondLineY = Math.min(...secondLineYs)
    expect(minSecondLineY).toBeCloseTo(expectedTargetHeight + expectedSpacing)
  })

  it("keeps lowercase letters on the baseline and renders descenders below it", () => {
    const text: Text = {
      _pcb_drawing_object_id: "text_1",
      pcb_drawing_type: "text",
      text: "ap",
      x: 0,
      y: 5,
      size: 10,
      layer: "top_silkscreen",
    }

    const baselineOffset = getLowercaseBaselineOffset()
    const targetHeight = text.size * 0.7

    const aOnlyLines = convertTextToLines({ ...text, text: "a" })
    const aYs = aOnlyLines.flatMap((line) => [line.y1, line.y2])
    expect(Math.min(...aYs)).toBeCloseTo(text.y)

    const lines = convertTextToLines(text)
    const yValues = lines.flatMap((line) => [line.y1, line.y2])
    const minY = Math.min(...yValues)

    expect(minY).toBeCloseTo(text.y - baselineOffset * targetHeight)
  })
})
