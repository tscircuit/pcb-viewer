import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import {
  DETOUR_EXTRA_LENGTH,
  renderDifferentialPairBoard,
} from "../../../fixtures/local-skew/differential-pair-board"

test("reports the pair's largest local skew and its maxLengthSkew", () => {
  const pairs = computeLocalSkew(
    renderDifferentialPairBoard({ compensated: true }),
  )

  expect(pairs).toHaveLength(1)
  expect(pairs[0].name).toBe("USB")
  expect(pairs[0].max_skew).toBeCloseTo(DETOUR_EXTRA_LENGTH, 5)
  expect(pairs[0].max_length_skew).toBe(0.1)
})
