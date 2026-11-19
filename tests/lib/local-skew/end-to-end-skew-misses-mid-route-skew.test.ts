import { expect, test } from "bun:test"
import type { PcbTrace } from "circuit-json"
import { renderDifferentialPairBoard } from "../../fixtures/local-skew/differential-pair-board"

/** Length the positive trace's detour adds before the negative trace catches up, in mm. */
const DETOUR_EXTRA_LENGTH = 2 * Math.sqrt(0.5 ** 2 + 1 ** 2) - 1

test("end-to-end skew passes a pair that is out of phase mid-route", () => {
  const circuitJson = renderDifferentialPairBoard()

  const traceLengths = circuitJson
    .filter((element): element is PcbTrace => element.type === "pcb_trace")
    .map((trace) => trace.trace_length ?? 0)
  const skewErrors = circuitJson.filter(
    (element) => element.type === "pcb_bus_length_skew_error",
  )

  // The total lengths match, so the only skew check finds nothing to report,
  // even though the positive trace is ahead by DETOUR_EXTRA_LENGTH between
  // the two detours. Nothing in the viewer shows that stretch today.
  expect(traceLengths).toHaveLength(2)
  expect(traceLengths[0]).toBeCloseTo(traceLengths[1], 9)
  expect(skewErrors).toHaveLength(0)
  expect(DETOUR_EXTRA_LENGTH).toBeGreaterThan(1.2)
})
