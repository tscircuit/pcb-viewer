import "bun-match-svg"
import { expect, test } from "bun:test"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

/** Extra length added by each 0.5 mm triangular detour on the fan-in/fan-out. */
const FANOUT_DETOUR_EXTRA = 2 * Math.hypot(0.5, 0.5) - 1

test("parallel stretches leaving wider source and load pads couple at the pad separation", async () => {
  // Source pads are 3.0 mm apart (y = ±1.5), load pads 2.4 mm apart (y = ±1.2),
  // both wider than the 0.45 mm trace gap's 0.72 mm coupling limit. DP has an
  // extra detour on the start fan-in and DN has a matching one on the load
  // fan-out so the positive and negative step indices differ at both ends.
  const circuitJson = renderPairBoard({
    sourcePadHalfPitch: 1.5,
    loadPadHalfPitch: 1.2,
    positivePath: [
      { x: 3, y: 0 },
      { x: 3.5, y: 0.5 },
      { x: 4, y: 0 },
      { x: 6, y: -1.2 },
      { x: 18, y: -1.2 },
      { x: 20, y: -0.3 },
    ],
    negativePath: [
      { x: 4, y: 0 },
      { x: 6, y: 1.2 },
      { x: 18, y: 1.2 },
      { x: 20, y: 0.3 },
      { x: 20.5, y: -0.2 },
      { x: 21, y: 0.3 },
    ],
    pcbTraceGap: "0.45mm",
  })

  const [pair] = computeLocalSkew(circuitJson)

  const startFanout = segmentAtX({ segments: pair.positive.segments, x: -10.5 })
  const mainRun = segmentAtX({ segments: pair.positive.segments, x: 0 })
  const endFanout = segmentAtX({ segments: pair.positive.segments, x: 10.5 })

  expect(startFanout.coupling).toBe("coupled")
  expect(startFanout.skew).toBe(0)
  expect(mainRun.coupling).toBe("coupled")
  expect(mainRun.skew).toBeCloseTo(FANOUT_DETOUR_EXTRA, 5)
  expect(endFanout.coupling).toBe("coupled")
  expect(endFanout.skew).toBe(0)
  expect(pair.max_skew).toBeCloseTo(FANOUT_DETOUR_EXTRA, 5)

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
