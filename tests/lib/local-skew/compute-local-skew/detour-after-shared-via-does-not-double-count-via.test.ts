import "bun-match-svg"
import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("a detour right after a shared via does not double-count the partner's single via", async () => {
  // Both traces run together on top to x = 0 and drop through symmetric 1.6 mm
  // vias to bottom. DN immediately continues coupled along [0, 6] on bottom
  // (no copper gap between its two coupled runs, only the single via at x = 0).
  // DP takes a 4 mm (1 x 1 mm) loop on bottom at x = 0 before rejoining DN.
  // DN's single via was already balanced by DP's via at the end of the top run,
  // so DP's skew ramps from 0 to 4.0 mm across the loop — never 5.6 mm.
  const circuitJson = renderPairBoard({
    positivePath: [
      { x: 12, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
      { x: 11, y: 0 },
      { x: 11, y: 1 },
      { x: 12, y: 1 },
      { x: 12, y: 0 },
      { x: 18, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
    ],
    negativePath: [
      { x: 12, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
      { x: 18, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
    ],
    pcbTraceGap: "0.45mm",
  })

  const [pair] = computeLocalSkew(circuitJson)

  expect(segmentAtX({ segments: pair.positive.segments, x: -6 }).skew).toBe(0)
  expect(
    segmentAtX({ segments: pair.positive.segments, x: 3 }).skew,
  ).toBeCloseTo(4, 5)
  expect(
    segmentAtX({ segments: pair.negative.segments, x: 3 }).skew,
  ).toBeCloseTo(-4, 5)

  // At x = -0.5, y = 1.3 (2.5 mm along the 4 mm loop), skew is 2.5 mm (not 3.5 mm).
  const loopTop = segmentAtX({
    segments: pair.positive.segments,
    x: -0.5,
    y: 1.3,
  })
  expect(loopTop.coupling).toBe("interpolated")
  expect(loopTop.skew).toBeCloseTo(2.5, 2)

  expect(pair.positive.scale).toEqual({ positive: 4, negative: 0 })
  expect(pair.max_skew).toBeCloseTo(4, 5)

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
