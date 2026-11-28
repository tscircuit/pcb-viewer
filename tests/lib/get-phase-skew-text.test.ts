import { expect, test } from "bun:test"
import { getPhaseSkewText } from "../../src/lib/phase-skew/get-phase-skew-text"

test("labels phase skew as leading, lagging or in phase", () => {
  expect(getPhaseSkewText(1.8234)).toBe("Leading 1.823 mm")
  expect(getPhaseSkewText(-2.351)).toBe("Lagging 2.351 mm")
  expect(getPhaseSkewText(0.0004)).toBe("In phase")
  expect(getPhaseSkewText(-0.0004)).toBe("In phase")
})
