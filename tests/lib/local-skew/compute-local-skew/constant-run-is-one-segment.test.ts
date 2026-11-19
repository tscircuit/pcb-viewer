import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"

test("a run with constant skew is one segment, not one per sample", () => {
  // An asymmetric detour leaves a constant skew whose two ends differ in
  // the last bits of floating point.
  const [pair] = computeLocalSkew(
    renderPairBoard({
      positivePath: [
        { x: 2, y: 0 },
        { x: 2.3, y: 0.7 },
        { x: 3.1, y: 0 },
      ],
      negativePath: [],
      pcbTraceGap: "0.45mm",
    }),
  )

  const afterDetour = pair.positive.segments.filter(
    (segment) => segment.start.y === 0.3 && segment.start.x >= -8.9,
  )
  expect(afterDetour).toHaveLength(1)
  expect(afterDetour[0].end.x).toBeCloseTo(12, 9)
})
