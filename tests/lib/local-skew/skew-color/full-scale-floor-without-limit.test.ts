import { expect, test } from "bun:test"
import {
  fullScaleFor,
  skewColor,
} from "../../../../src/lib/local-skew/skew-color"

test("without a limit, a tiny skew is not painted in full colour", () => {
  const fullScale = fullScaleFor({ maxLengthSkew: undefined, maxSkew: 0.0001 })

  expect(fullScale).toBe(0.05)
  expect(skewColor({ skew: 0.0001, fullScale })).not.toBe("rgb(255, 77, 77)")
  expect(fullScaleFor({ maxLengthSkew: 0.1, maxSkew: 3 })).toBe(0.1)
  expect(fullScaleFor({ maxLengthSkew: undefined, maxSkew: 2 })).toBe(2)
})
