import { expect, test } from "bun:test"
import { skewColor } from "../../../../src/lib/local-skew/skew-color"

test("a zero full scale paints any non-zero skew in KiCad's full blue or red", () => {
  expect(skewColor({ skew: 0.8, fullScale: 0 })).toBe("rgb(0, 0, 255)")
  expect(skewColor({ skew: -0.8, fullScale: 0 })).toBe("rgb(255, 0, 0)")
  expect(skewColor({ skew: 0, fullScale: 0 })).toBe("rgb(255, 255, 255)")
})
