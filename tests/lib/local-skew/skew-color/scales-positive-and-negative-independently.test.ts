import { expect, test } from "bun:test"
import { skewColor } from "../../../../src/lib/local-skew/skew-color"

test("skewColor scales positive and negative skew independently per trace", () => {
  const scale = { positive: 3, negative: 1 }

  expect(skewColor({ skew: 1.5, fullScale: scale })).toBe("rgb(128, 128, 255)")
  expect(skewColor({ skew: 3, fullScale: scale })).toBe("rgb(0, 0, 255)")
  expect(skewColor({ skew: -1, fullScale: scale })).toBe("rgb(255, 0, 0)")

  const tiny = { positive: 0.001, negative: 0 }
  expect(skewColor({ skew: 0.001, fullScale: tiny })).toBe("rgb(0, 0, 255)")
})
