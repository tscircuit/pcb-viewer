import { expect, test } from "bun:test"
import {
  resolveSkewPalette,
  rgbString,
  skewColor,
} from "../../../../src/lib/local-skew/skew-color"

const palette = resolveSkewPalette({})

test("skewColor matches KiCad's white-to-blue/red linear scale and 50% grey for unknown", () => {
  const fullScale = { positiveScale: 1, negativeScale: 1 }
  expect(rgbString(skewColor({ palette, skew: 0, ...fullScale }))).toBe(
    "rgb(255, 255, 255)",
  )
  expect(rgbString(skewColor({ palette, skew: 1, ...fullScale }))).toBe(
    "rgb(0, 0, 255)",
  )
  expect(rgbString(skewColor({ palette, skew: -1, ...fullScale }))).toBe(
    "rgb(255, 0, 0)",
  )
  expect(rgbString(skewColor({ palette, skew: 0.5, ...fullScale }))).toBe(
    "rgb(128, 128, 255)",
  )
  expect(rgbString(skewColor({ palette, skew: -0.5, ...fullScale }))).toBe(
    "rgb(255, 128, 128)",
  )
  expect(rgbString(skewColor({ palette, skew: 2, ...fullScale }))).toBe(
    "rgb(0, 0, 255)",
  )
  expect(rgbString(skewColor({ palette, skew: -2, ...fullScale }))).toBe(
    "rgb(255, 0, 0)",
  )
  expect(rgbString(skewColor({ palette, ...fullScale }))).toBe(
    "rgb(128, 128, 128)",
  )
})
