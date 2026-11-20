import "bun-match-svg"
import { expect, test } from "bun:test"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import {
  type PairPathPoint,
  renderPairBoard,
} from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

/** Drops to the bottom layer at x = -6 and returns at x = 6. */
const BOTTOM_LAYER_HOP: PairPathPoint[] = [
  { x: 6, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
  { x: 18, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
]

test("the run between two vias is coupled on the bottom layer", async () => {
  const circuitJson = renderPairBoard({
    positivePath: BOTTOM_LAYER_HOP,
    negativePath: BOTTOM_LAYER_HOP,
    pcbTraceGap: "0.45mm",
  })
  const [pair] = computeLocalSkew(circuitJson)

  for (const segments of [pair.positive.segments, pair.negative.segments]) {
    const between = segmentAtX({ segments, x: 0 })
    expect(between.layer).toBe("bottom")
    expect(between.coupling).toBe("coupled")
    expect(between.skew).toBe(0)
  }
  expect(pair.max_skew).toBe(0)

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
