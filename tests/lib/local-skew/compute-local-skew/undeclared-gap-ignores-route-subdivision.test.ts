import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import {
  type PairPathPoint,
  renderPairBoard,
} from "../../../fixtures/local-skew/pair-board"

/**
 * DN runs 2 mm below DP between x = -11 and x = 11. Both routes get extra
 * collinear points every `step` mm.
 */
function renderFarPair({ step }: { step: number }) {
  const positivePath: PairPathPoint[] = []
  const negativeAlong: PairPathPoint[] = []
  for (let x = step; x < 24; x += step) positivePath.push({ x, y: 0 })
  for (let x = 1 + step; x < 23; x += step) negativeAlong.push({ x, y: -1.4 })
  return renderPairBoard({
    positivePath,
    negativePath: [
      { x: 1, y: 0 },
      { x: 1, y: -1.4 },
      ...negativeAlong,
      { x: 23, y: -1.4 },
      { x: 23, y: 0 },
    ],
  })
}

test("without pcbTraceGap, splitting a route into more points doesn't change coupling", () => {
  const coupling = (step: number) =>
    computeLocalSkew(renderFarPair({ step }))[0].positive.segments.map(
      (segment) => `${segment.start.x.toFixed(3)}:${segment.coupling}`,
    )

  // 2 mm apart is beyond ten trace widths, so the far stretch never couples,
  // whether DN is one 22 mm step or 22 steps of 1 mm.
  expect(coupling(1)).toEqual(coupling(30))
  const [pair] = computeLocalSkew(renderFarPair({ step: 1 }))
  const middle = pair.positive.segments.find(
    (segment) => segment.start.x <= 0 && segment.end.x >= 0,
  )
  expect(middle?.coupling).toBe("interpolated")
})
