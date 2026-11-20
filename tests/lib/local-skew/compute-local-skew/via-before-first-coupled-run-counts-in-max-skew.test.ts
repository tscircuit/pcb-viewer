import "bun-match-svg"
import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("a via right before the first coupled run still counts toward max_skew", async () => {
  // Mirror the last-via case: DN starts away from DP and returns to top at
  // x = 6. DP's detour makes the two traces equal just after DN's return via,
  // so the 1.6 mm skew just before it is only known from the via step.
  const circuitJson = renderPairBoard({
    positivePath: [
      { x: 4, y: 0 },
      { x: 4, y: 3.6 },
      { x: 6, y: 3.6 },
      { x: 6, y: 0 },
    ],
    negativePath: [
      { x: 0, y: -2 },
      { x: 2, y: -2 },
      { x: 2, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
      { x: 18, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
    ],
    pcbTraceGap: "0.45mm",
  })

  const [pair] = computeLocalSkew(circuitJson)

  const before = segmentAtX({ segments: pair.positive.segments, x: 0 })
  const after = segmentAtX({ segments: pair.positive.segments, x: 9 })
  expect(before.coupling).toBe("unknown")
  expect(before.skew).toBeNull()
  expect(after.coupling).toBe("coupled")
  expect(after.skew).toBe(0)
  expect(pair.positive.scale).toEqual({ positive: 1.6, negative: 0 })
  expect(pair.negative.scale).toEqual({ positive: 0, negative: 1.6 })
  expect(pair.max_skew).toBeCloseTo(1.6, 5)

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
