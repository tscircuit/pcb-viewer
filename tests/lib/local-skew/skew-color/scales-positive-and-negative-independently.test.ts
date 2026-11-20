import { expect, test } from "bun:test"
import {
  skewColor,
  skewScaleFor,
} from "../../../../src/lib/local-skew/skew-color"

test("skewScaleFor scales positive and negative skew independently per trace with no floor", () => {
  const scale = skewScaleFor([
    { skew: null },
    { skew: 0 },
    { skew: 3 },
    { skew: -1 },
  ])

  expect(scale).toEqual({ positive: 3, negative: 1 })
  expect(skewColor({ skew: 1.5, fullScale: scale })).toBe("rgb(128, 128, 255)")
  expect(skewColor({ skew: 3, fullScale: scale })).toBe("rgb(0, 0, 255)")
  expect(skewColor({ skew: -1, fullScale: scale })).toBe("rgb(255, 0, 0)")

  // Like KiCad, there is no minimum full-scale floor: a tiny peak still reaches full colour.
  const tiny = skewScaleFor([{ skew: 0 }, { skew: 0.0001 }])
  expect(tiny).toEqual({ positive: 0.0001, negative: 0 })
  expect(skewColor({ skew: 0.0001, fullScale: tiny })).toBe("rgb(0, 0, 255)")
})
