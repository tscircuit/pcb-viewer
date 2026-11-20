import "bun-match-svg"
import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import {
  DETOUR_EXTRA_LENGTH,
  renderDirectedPairBoard,
} from "../../../fixtures/local-skew/directed-pair-board"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("when each trace has one output end port, both traces walk from the output end", async () => {
  // Both DP and DN are stored receiver (x = -12) -> output driver (x = 12),
  // with DP detouring right after the driver at x = 9..10.
  const circuitJson = renderDirectedPairBoard()
  const [pair] = computeLocalSkew(circuitJson)

  // Walking from U_TX (x = 12) to U_RX (x = -12): skew is 0 before DP's
  // detour (x = 11) and +DETOUR_EXTRA_LENGTH from x = 9 all the way to U_RX.
  expect(segmentAtX({ segments: pair.positive.segments, x: 11 }).skew).toBe(0)
  expect(
    segmentAtX({ segments: pair.positive.segments, x: 0 }).skew,
  ).toBeCloseTo(DETOUR_EXTRA_LENGTH, 5)
  expect(
    segmentAtX({ segments: pair.negative.segments, x: 0 }).skew,
  ).toBeCloseTo(-DETOUR_EXTRA_LENGTH, 5)
  expect(
    segmentAtX({ segments: pair.positive.segments, x: -11 }).skew,
  ).toBeCloseTo(DETOUR_EXTRA_LENGTH, 5)

  // Mixed stored directions (DP reversed, DN already from output) also walk from U_TX.
  const [mixed] = computeLocalSkew(
    renderDirectedPairBoard({ negativeFromOutput: true }),
  )
  expect(segmentAtX({ segments: mixed.positive.segments, x: 11 }).skew).toBe(0)
  expect(
    segmentAtX({ segments: mixed.positive.segments, x: 0 }).skew,
  ).toBeCloseTo(DETOUR_EXTRA_LENGTH, 5)

  // When both ends are marked output (ambiguous), fall back to stored positive order.
  const [ambiguous] = computeLocalSkew(
    renderDirectedPairBoard({ bothEndsOutput: true }),
  )
  expect(segmentAtX({ segments: ambiguous.positive.segments, x: 0 }).skew).toBe(
    0,
  )
  expect(
    segmentAtX({ segments: ambiguous.positive.segments, x: 11 }).skew,
  ).toBeCloseTo(DETOUR_EXTRA_LENGTH, 5)

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
