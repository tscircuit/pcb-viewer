import { expect, test } from "bun:test"
import {
  resolveSkewPalette,
  rgbString,
  skewColor,
} from "../../../../src/lib/local-skew/skew-color"

const palette = resolveSkewPalette({})

test("skewColor stays white through 0.0005 mm and ramps to full colour at a minimum of 0.001 mm", () => {
  // describeSkew formats magnitudes to 3 decimal places (1 µm), so anything
  // with |skew| < 0.0005 mm reads as 0.000 mm ("in step") and must paint white.
  const subDisplay = { positiveScale: 0.00049, negativeScale: 0.00049 }
  expect(rgbString(skewColor({ palette, skew: 0.00041, ...subDisplay }))).toBe(
    "rgb(255, 255, 255)",
  )
  expect(rgbString(skewColor({ palette, skew: -0.00041, ...subDisplay }))).toBe(
    "rgb(255, 255, 255)",
  )
  expect(rgbString(skewColor({ palette, skew: 0.00049, ...subDisplay }))).toBe(
    "rgb(255, 255, 255)",
  )
  expect(rgbString(skewColor({ palette, skew: -0.00049, ...subDisplay }))).toBe(
    "rgb(255, 255, 255)",
  )
  // Even a zero scale does not saturate sub-display skew.
  expect(
    rgbString(
      skewColor({ palette, skew: 0.00041, positiveScale: 0, negativeScale: 0 }),
    ),
  ).toBe("rgb(255, 255, 255)")

  const nearThreshold = { positiveScale: 0.0006, negativeScale: 0.0009 }
  expect(
    rgbString(skewColor({ palette, skew: 0.0005, ...nearThreshold })),
  ).toBe("rgb(255, 255, 255)")
  expect(
    rgbString(skewColor({ palette, skew: -0.0005, ...nearThreshold })),
  ).toBe("rgb(255, 255, 255)")
  expect(
    rgbString(skewColor({ palette, skew: 0.00051, ...nearThreshold })),
  ).toBe("rgb(250, 250, 255)")
  expect(
    rgbString(skewColor({ palette, skew: -0.00075, ...nearThreshold })),
  ).toBe("rgb(255, 128, 128)")
  expect(rgbString(skewColor({ palette, skew: 0.001, ...nearThreshold }))).toBe(
    "rgb(0, 0, 255)",
  )
  expect(
    rgbString(skewColor({ palette, skew: -0.001, ...nearThreshold })),
  ).toBe("rgb(255, 0, 0)")
})
