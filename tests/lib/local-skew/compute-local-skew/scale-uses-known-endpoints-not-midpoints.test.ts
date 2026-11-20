import "bun-match-svg"
import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { skewColor } from "../../../../src/lib/local-skew/skew-color"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"

/** DN's slanted 20 mm run is ~0.00196 mm longer than DP's straight run. */
const SLANT_EXTRA_LENGTH = Math.hypot(20, 0.28) - 20

test("each trace colour scale comes from known span endpoints, not piece midpoints", async () => {
  // DN slants 0.28 mm over 20 mm (still parallel at cos ~0.999902) inside a
  // 0.8 mm gap, so the whole run is coupled and split into 2 pieces with
  // midpoints ~0.00049 and ~0.00147 mm while the endpoint peaks at ~0.00196 mm.
  const circuitJson = renderPairBoard({
    positivePath: [{ x: 2, y: 0 }],
    negativePath: [
      { x: 2, y: 0 },
      { x: 22, y: -0.28 },
    ],
    pcbTraceGap: "0.8mm",
  })

  const [pair] = computeLocalSkew(circuitJson)
  const slanted = pair.negative.segments.filter(
    (segment) =>
      segment.coupling === "coupled" && segment.start.y !== segment.end.y,
  )
  expect(slanted).toHaveLength(2)

  // Scale comes from the 0.00196 mm span endpoint, not the 0.00147 mm midpoint.
  expect(pair.negative.scale.positive).toBeCloseTo(SLANT_EXTRA_LENGTH, 5)
  expect(pair.negative.scale.negative).toBe(0)
  expect(pair.positive.scale.positive).toBe(0)
  expect(pair.positive.scale.negative).toBeCloseTo(SLANT_EXTRA_LENGTH, 5)

  const secondPiece = slanted[1]
  expect(secondPiece.skew).toBeCloseTo(0.00147, 5)
  expect(
    skewColor({ skew: secondPiece.skew, fullScale: pair.negative.scale }),
  ).toBe("rgb(64, 64, 255)")

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
