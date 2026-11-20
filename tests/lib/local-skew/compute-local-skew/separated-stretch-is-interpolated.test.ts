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
  // Halfway through the split, skew is halfway from 0 to the 12 mm detour,
  // to within the 0.05 mm sampling.
  expect(apart.skew).toBeCloseTo(-6, 1)
  const negativeApart = segmentAtX({ segments: pair.negative.segments, x: 0 })
  expect(negativeApart.coupling).toBe("interpolated")
  expect(negativeApart.skew).toBeCloseTo(6, 1)
  // The 12 mm ramp is cut every 0.05 mm, each piece a step further along.
  const ramp = pair.positive.segments.filter(
    (segment) => segment.coupling === "interpolated",
  )
  expect(ramp).toHaveLength(240)
  ramp.slice(1).forEach((segment, index) => {
    expect(segment.skew ?? 0).toBeLessThan(ramp[index].skew ?? 0)
  })
  // Only the measured stretches count toward the maximum: 12 mm of detour.
  expect(pair.max_skew).toBeCloseTo(12, 5)
})
