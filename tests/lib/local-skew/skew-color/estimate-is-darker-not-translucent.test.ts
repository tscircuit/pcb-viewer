import { expect, test } from "bun:test"
import { skewColor } from "../../../../src/lib/local-skew/skew-color"

test("an estimated skew is the same hue, darker, so copper beneath can't tint it", () => {
  expect(skewColor({ skew: 0.8, fullScale: 0, isEstimate: true })).toBe(
    "rgb(140, 42, 42)",
  )
  expect(skewColor({ skew: -0.8, fullScale: 0, isEstimate: true })).toBe(
    "rgb(42, 78, 140)",
  )
  expect(skewColor({ skew: 0, fullScale: 0.1, isEstimate: true })).toBe(
    "rgb(25, 112, 62)",
  )
})
