import "bun-match-svg"
import { expect, test } from "bun:test"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import {
  DETOUR_EXTRA_LENGTH,
  renderDifferentialPairBoard,
} from "../../../fixtures/local-skew/differential-pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("positive trace is longer by the detour length between the detours", async () => {
  const circuitJson = renderDifferentialPairBoard({ compensated: true })
  const [pair] = computeLocalSkew(circuitJson)

  const positive = segmentAtX({ segments: pair.positive.segments, x: 0 })
  const negative = segmentAtX({ segments: pair.negative.segments, x: 0 })
  expect(positive.coupling).toBe("coupled")
  expect(positive.skew).toBeCloseTo(DETOUR_EXTRA_LENGTH, 5)
  expect(negative.skew).toBeCloseTo(-DETOUR_EXTRA_LENGTH, 5)

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
