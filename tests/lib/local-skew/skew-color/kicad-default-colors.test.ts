import { expect, test } from "bun:test"
import { skewColor } from "../../../../src/lib/local-skew/skew-color"

test("skewColor matches KiCad's white-to-blue/red linear scale and 50% grey for unknown", () => {
  const fullScale = { positiveScale: 1, negativeScale: 1 }
  expect(skewColor({ skew: 0, ...fullScale })).toBe("rgb(255, 255, 255)")
  expect(skewColor({ skew: 1, ...fullScale })).toBe("rgb(0, 0, 255)")
  expect(skewColor({ skew: -1, ...fullScale })).toBe("rgb(255, 0, 0)")
  expect(skewColor({ skew: 0.5, ...fullScale })).toBe("rgb(128, 128, 255)")
  expect(skewColor({ skew: -0.5, ...fullScale })).toBe("rgb(255, 128, 128)")
  expect(skewColor({ skew: 2, ...fullScale })).toBe("rgb(0, 0, 255)")
  expect(skewColor({ skew: -2, ...fullScale })).toBe("rgb(255, 0, 0)")
  expect(skewColor({ ...fullScale })).toBe("rgb(128, 128, 128)")
})
