import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderDifferentialPairBoard } from "../../../fixtures/local-skew/differential-pair-board"
import { skewAtX } from "../../../fixtures/local-skew/skew-at-x"

test("skew is zero before the first detour and after the second", () => {
  const [pair] = computeLocalSkew(renderDifferentialPairBoard())

  expect(skewAtX({ segments: pair.positive.segments, x: -11 })).toBe(0)
  expect(skewAtX({ segments: pair.positive.segments, x: 11 })).toBe(0)
  expect(skewAtX({ segments: pair.negative.segments, x: -11 })).toBe(0)
  expect(skewAtX({ segments: pair.negative.segments, x: 11 })).toBe(0)
})
