import { expect, test } from "bun:test"
import { skewColor } from "../../../../src/lib/local-skew/skew-color"

test("a zero-skew limit paints any skew in the full longer or shorter colour", () => {
  expect(skewColor({ skew: 0.8, fullScale: 0 })).toBe("rgb(255, 77, 77)")
  expect(skewColor({ skew: -0.8, fullScale: 0 })).toBe("rgb(77, 141, 255)")
  expect(skewColor({ skew: 0, fullScale: 0 })).toBe("rgb(46, 204, 113)")
})
