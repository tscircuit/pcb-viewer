import { expect, test } from "bun:test"
import { skewColor } from "../../../../src/lib/local-skew/skew-color"

test("skewColor stays white through 0.0005 mm and ramps to full colour at a minimum of 0.001 mm", () => {
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

  const nearThreshold = { positive: 0.0006, negative: 0.0009 }
  expect(skewColor({ skew: 0.0005, fullScale: nearThreshold })).toBe(
    "rgb(255, 255, 255)",
  )
  expect(skewColor({ skew: -0.0005, fullScale: nearThreshold })).toBe(
    "rgb(255, 255, 255)",
  )
  expect(skewColor({ skew: 0.00051, fullScale: nearThreshold })).toBe(
    "rgb(250, 250, 255)",
  )
  expect(skewColor({ skew: -0.00075, fullScale: nearThreshold })).toBe(
    "rgb(255, 128, 128)",
  )
  expect(skewColor({ skew: 0.001, fullScale: nearThreshold })).toBe(
    "rgb(0, 0, 255)",
  )
  expect(skewColor({ skew: -0.001, fullScale: nearThreshold })).toBe(
    "rgb(255, 0, 0)",
  )
})
