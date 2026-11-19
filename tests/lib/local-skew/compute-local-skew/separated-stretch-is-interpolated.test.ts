import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("a stretch where the traces split apart is marked interpolated, not measured", () => {
  // DN drops 6 mm away between x = -6 and x = 6.
  const [pair] = computeLocalSkew(
    renderPairBoard({
      positivePath: [],
      negativePath: [
        { x: 6, y: 0 },
        { x: 6, y: -6 },
        { x: 18, y: -6 },
        { x: 18, y: 0 },
      ],
      pcbTraceGap: "0.45mm",
    }),
  )

  const beside = segmentAtX({ segments: pair.positive.segments, x: -9 })
  const apart = segmentAtX({ segments: pair.positive.segments, x: 0 })
  expect(beside.coupling).toBe("coupled")
  expect(beside.skew).toBe(0)
  expect(apart.coupling).toBe("interpolated")
  // Only the measured stretches count toward the maximum: 12 mm of detour.
  expect(pair.max_skew).toBeCloseTo(12, 5)
})
