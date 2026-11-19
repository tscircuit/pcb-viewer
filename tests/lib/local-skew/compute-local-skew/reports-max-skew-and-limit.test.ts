import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderDifferentialPairBoard } from "../../../fixtures/local-skew/differential-pair-board"

test("reports the pair's largest local skew and its maxLengthSkew", () => {
  const pairs = computeLocalSkew(renderDifferentialPairBoard())

  expect(pairs).toHaveLength(1)
  expect(pairs[0].name).toBe("USB")
  expect(pairs[0].max_skew).toBeCloseTo(1.23607, 4)
  expect(pairs[0].max_length_skew).toBe(0.1)
})
