import "bun-match-svg"
import { expect, test } from "bun:test"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import {
  DETOUR_EXTRA_LENGTH,
  renderDifferentialPairBoard,
} from "../../../fixtures/local-skew/differential-pair-board"

test("reports the pair's largest local skew and its maxLengthSkew", async () => {
  const circuitJson = renderDifferentialPairBoard({ compensated: true })
  const pairs = computeLocalSkew(circuitJson)

  expect(pairs).toHaveLength(1)
  expect(pairs[0].name).toBe("USB")
  expect(pairs[0].max_skew).toBeCloseTo(DETOUR_EXTRA_LENGTH, 5)
  expect(pairs[0].max_length_skew).toBe(0.1)

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
