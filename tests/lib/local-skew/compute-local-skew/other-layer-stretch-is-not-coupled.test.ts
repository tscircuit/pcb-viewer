import "bun-match-svg"
import { expect, test } from "bun:test"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("a stretch where the traces are on different layers is not coupled", async () => {
  // DN drops to the bottom layer between x = -6 and x = 6; DP stays on top.
  const circuitJson = renderPairBoard({
    positivePath: [],
    negativePath: [
      { x: 6, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
      { x: 18, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
    ],
    pcbTraceGap: "0.45mm",
  })
  const [pair] = computeLocalSkew(circuitJson)

  expect(segmentAtX({ segments: pair.positive.segments, x: -9 }).coupling).toBe(
    "coupled",
  )
  expect(segmentAtX({ segments: pair.positive.segments, x: 0 }).coupling).toBe(
    "interpolated",
  )

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
