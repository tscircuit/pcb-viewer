import { expect, test } from "bun:test"
import {
  resolveSkewPalette,
  rgbString,
  skewColor,
} from "../../../../src/lib/local-skew/skew-color"

const palette = resolveSkewPalette({})

test("skewColor scales positive and negative skew independently per trace", () => {
  const scale = { positiveScale: 3, negativeScale: 1 }

  expect(rgbString(skewColor({ palette, skew: 1.5, ...scale }))).toBe(
    "rgb(128, 128, 255)",
  )
  expect(rgbString(skewColor({ palette, skew: 3, ...scale }))).toBe(
    "rgb(0, 0, 255)",
  )
  expect(rgbString(skewColor({ palette, skew: -1, ...scale }))).toBe(
    "rgb(255, 0, 0)",
  )

  const tiny = { positiveScale: 0.001, negativeScale: 0 }
  expect(rgbString(skewColor({ palette, skew: 0.001, ...tiny }))).toBe(
    "rgb(0, 0, 255)",
  )
})
