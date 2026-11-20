import "bun-match-svg"
import { expect, test } from "bun:test"
import type { PcbTrace } from "circuit-json"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { localSkewSvg } from "../../../fixtures/local-skew/local-skew-svg"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

/** Extra copper length DP adds solely in the trailing uncoupled fan-out: 2 * 2.2225 mm. */
const TRAILING_DETOUR_EXTRA_LENGTH = 4.445

// Derived from KiCad QA tests `DRCLengths` (`time_calculations` CLASS7 in test_drc_lengths.cpp) and `DRCFalsePositiveRegressions` (`issue7975` in test_drc_regressions.cpp).
test("wide-pad fan-in and trailing uncoupled detour keep coupled local skew and max_skew at zero", async () => {
  // With pcbTraceGap = 0.15 mm and 0.15 mm traces, maxOffset = (0.15 + 0.15) * 1.2 = 0.36 mm.
  // Source and load pads are 0.60 mm apart (> 0.36 mm), so leading (x < -9.85) and trailing
  // (x > 4.0) regions are uncoupled ("unknown").
  // Both legs fan in symmetrically by 2 + 0.15 * sqrt(2) mm to y = +/-0.15 (pitch 0.30 mm <= 0.36 mm)
  // over x in [-9.85, 4.0], so local skew throughout the coupled body is 0.
  // Past x = 4.0 both legs widen to 0.60 mm and DP adds a 2.2225 mm vertical loop (+4.445 mm total)
  // purely in the trailing uncoupled region, leaving pair.max_skew === 0.
  const circuitJson = renderPairBoard({
    positivePath: [
      { x: 2, y: 0 },
      { x: 2.15, y: -0.15 },
      { x: 16, y: -0.15 },
      { x: 16.15, y: 0 },
      { x: 18, y: 0 },
      { x: 18, y: 2.2225 },
      { x: 20, y: 2.2225 },
      { x: 20, y: 0 },
    ],
    negativePath: [
      { x: 2, y: 0 },
      { x: 2.15, y: 0.15 },
      { x: 16, y: 0.15 },
      { x: 16.15, y: 0 },
    ],
    pcbTraceGap: "0.15mm",
  })
  const [pair] = computeLocalSkew(circuitJson)

  const traces = circuitJson.filter(
    (element): element is PcbTrace => element.type === "pcb_trace",
  )
  const positiveTrace = traces.find(
    (trace) => trace.pcb_trace_id === pair.positive.pcb_trace_id,
  )
  const negativeTrace = traces.find(
    (trace) => trace.pcb_trace_id === pair.negative.pcb_trace_id,
  )
  expect(
    (positiveTrace?.trace_length ?? 0) - (negativeTrace?.trace_length ?? 0),
  ).toBeCloseTo(TRAILING_DETOUR_EXTRA_LENGTH, 5)

  for (const segments of [pair.positive.segments, pair.negative.segments]) {
    const leading = segmentAtX({ segments, x: -11 })
    expect(leading.coupling).toBe("unknown")
    expect(leading.skew).toBeNull()

    const coupled = segmentAtX({ segments, x: -3 })
    expect(coupled.coupling).toBe("coupled")
    expect(coupled.skew).toBe(0)

    const trailingBeforeDetour = segmentAtX({ segments, x: 5 })
    expect(trailingBeforeDetour.coupling).toBe("unknown")
    expect(trailingBeforeDetour.skew).toBeNull()

    const trailingAtDetour = segmentAtX({ segments, x: 7 })
    expect(trailingAtDetour.coupling).toBe("unknown")
    expect(trailingAtDetour.skew).toBeNull()

    const trailingAfterDetour = segmentAtX({ segments, x: 10 })
    expect(trailingAfterDetour.coupling).toBe("unknown")
    expect(trailingAfterDetour.skew).toBeNull()

    for (const segment of segments) {
      const midX = (segment.start.x + segment.end.x) / 2
      if (midX < -9.85 || midX > 4.0) {
        expect(segment.coupling).toBe("unknown")
        expect(segment.skew).toBeNull()
      }
    }
  }

  expect(pair.max_skew).toBe(0)

  await expect(localSkewSvg(circuitJson)).toMatchSvgSnapshot(import.meta.path)
})
