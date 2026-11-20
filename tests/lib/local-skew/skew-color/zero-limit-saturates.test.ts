import { expect, test } from "bun:test"
import { skewColor } from "../../../../src/lib/local-skew/skew-color"

test("a zero full scale saturates at the 0.001 mm minimum", () => {
  const fullScale = { positiveScale: 0, negativeScale: 0 }
  expect(skewColor({ skew: 0.001, ...fullScale })).toBe("rgb(0, 0, 255)")
  expect(skewColor({ skew: -0.001, ...fullScale })).toBe("rgb(255, 0, 0)")
  expect(skewColor({ skew: 0, ...fullScale })).toBe("rgb(255, 255, 255)")
})
