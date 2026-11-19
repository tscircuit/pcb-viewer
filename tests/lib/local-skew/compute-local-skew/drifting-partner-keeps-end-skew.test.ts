import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"

/** DN's slanted 20 mm run is this much longer than DP's straight one, in mm. */
const SLANT_EXTRA_LENGTH = Math.hypot(20, 0.1) - 20

test("a slightly slanted partner keeps the skew it builds along the run", () => {
  // DN runs from x = -10 to x = 10 while drifting 0.1 mm away from DP.
  const [pair] = computeLocalSkew(
    renderPairBoard({
      positivePath: [{ x: 2, y: 0 }],
      negativePath: [
        { x: 2, y: 0 },
        { x: 22, y: -0.1 },
      ],
      pcbTraceGap: "0.45mm",
    }),
  )

  // The run's skew grows from 0 to the slant's extra length; the maximum
  // comes from its end, not its middle.
  expect(pair.max_skew).toBeCloseTo(SLANT_EXTRA_LENGTH, 5)
  // A change this small (0.25 µm) stays one piece instead of 400.
  const slanted = pair.negative.segments.filter(
    (segment) => segment.start.y !== segment.end.y,
  )
  expect(
    slanted.filter((segment) => segment.coupling === "coupled"),
  ).toHaveLength(1)
})
