import { expect, test } from "bun:test"
import { runAllRoutingChecks } from "@tscircuit/checks"
import type { PcbTrace, SourceBus, SourceTrace } from "circuit-json"
import {
  DETOUR_EXTRA_LENGTH,
  renderDifferentialPairBoard,
} from "../../fixtures/local-skew/differential-pair-board"
import { routeLengthToX } from "../../fixtures/local-skew/route-length-to-x"

/** Cross-sections and the skew expected there: none before the positive detour (x -10..-9) or after the negative one (x 8..9), the whole detour in between. */
const CROSS_SECTIONS = [
  { x: -11, skew: 0 },
  { x: -8.5, skew: DETOUR_EXTRA_LENGTH },
  { x: 0, skew: DETOUR_EXTRA_LENGTH },
  { x: 7.5, skew: DETOUR_EXTRA_LENGTH },
  { x: 11, skew: 0 },
]

test("end-to-end skew passes a pair that is out of phase mid-route", async () => {
  const circuitJson = renderDifferentialPairBoard({ compensated: true })

  // The bus is a differential pair with USB_DP as its positive trace.
  const pair = circuitJson.find(
    (element): element is SourceBus => element.type === "source_bus",
  )
  const traceName = (id: string | undefined) =>
    circuitJson.find(
      (element): element is SourceTrace =>
        element.type === "source_trace" && element.source_trace_id === id,
    )?.name
  expect(traceName(pair?.differential_pair?.positive_source_trace_id)).toBe(
    "USB_DP",
  )
  expect(traceName(pair?.differential_pair?.negative_source_trace_id)).toBe(
    "USB_DN",
  )
  expect(pair?.max_length_skew).toBe(0.1)

  // USB_DP is longer than USB_DN by the whole detour for the stretch
  // between the two detours, far beyond the pair's 0.1 mm limit...
  const skews = CROSS_SECTIONS.map(
    ({ x }) =>
      routeLengthToX({ circuitJson, traceName: "USB_DP", x }) -
      routeLengthToX({ circuitJson, traceName: "USB_DN", x }),
  )
  CROSS_SECTIONS.forEach(({ skew }, index) => {
    expect(skews[index]).toBeCloseTo(skew, 6)
  })
  // ...yet the totals match exactly...
  const totals = circuitJson
    .filter((element): element is PcbTrace => element.type === "pcb_trace")
    .map((trace) => trace.trace_length)
  expect(totals).toHaveLength(2)
  expect(totals[0]).toBeCloseTo(totals[1] ?? Number.NaN, 9)
  // ...so the routing checks, whose skew check compares totals against
  // the pair's 0.1 mm limit, report nothing.
  expect(await runAllRoutingChecks(circuitJson)).toEqual([])
})
