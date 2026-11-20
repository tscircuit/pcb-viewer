import { expect, test } from "bun:test"
import { skewColor } from "../../../../src/lib/local-skew/skew-color"

test("skewColor paints skew below the 0.0005 mm readout rounding threshold white", () => {
  // describeSkew formats magnitudes to 3 decimal places (1 µm), so anything
  // with |skew| < 0.0005 mm reads as 0.000 mm ("in step") and must paint white.
  const subDisplay = { positive: 0.00049, negative: 0.00049 }
  expect(skewColor({ skew: 0.00041, fullScale: subDisplay })).toBe(
    "rgb(255, 255, 255)",
  )
  expect(skewColor({ skew: -0.00041, fullScale: subDisplay })).toBe(
    "rgb(255, 255, 255)",
  )
  expect(skewColor({ skew: 0.00049, fullScale: subDisplay })).toBe(
    "rgb(255, 255, 255)",
  )
  expect(skewColor({ skew: -0.00049, fullScale: subDisplay })).toBe(
    "rgb(255, 255, 255)",
  )
  // Even a zero scale does not saturate sub-display skew.
  expect(
    skewColor({ skew: 0.00041, fullScale: { positive: 0, negative: 0 } }),
  ).toBe("rgb(255, 255, 255)")

  // At 0.0005 mm the readout rounds to 0.001 mm, so colouring resumes.
  const atThreshold = { positive: 0.0005, negative: 0.0005 }
  expect(skewColor({ skew: 0.0005, fullScale: atThreshold })).toBe(
    "rgb(0, 0, 255)",
  )
  expect(skewColor({ skew: -0.0005, fullScale: atThreshold })).toBe(
    "rgb(255, 0, 0)",
  )
})
