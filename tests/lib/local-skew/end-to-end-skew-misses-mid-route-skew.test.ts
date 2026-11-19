import { expect, test } from "bun:test"
import { checkPcbBusLengthSkew } from "@tscircuit/checks"
import type { PcbTrace, SourceBus } from "circuit-json"
import {
  DETOUR_EXTRA_LENGTH,
  renderDifferentialPairBoard,
} from "../../fixtures/local-skew/differential-pair-board"
import { routeLengthToX } from "../../fixtures/local-skew/route-length-to-x"

/** A cross-section between the two detours, in mm. */
const MID_ROUTE_X = 0

test("end-to-end skew passes a pair that is out of phase mid-route", () => {
  const circuitJson = renderDifferentialPairBoard({ compensated: true })

  const midRouteSkew =
    routeLengthToX({ circuitJson, traceName: "USB_DP", x: MID_ROUTE_X }) -
    routeLengthToX({ circuitJson, traceName: "USB_DN", x: MID_ROUTE_X })

  // USB_DP is longer than USB_DN by the whole detour between the detours,
  // far beyond the pair's 0.1 mm limit...
  expect(midRouteSkew).toBeCloseTo(DETOUR_EXTRA_LENGTH, 6)
  // ...yet the totals match exactly...
  const totals = circuitJson
    .filter((element): element is PcbTrace => element.type === "pcb_trace")
    .map((trace) => trace.trace_length)
  expect(totals).toHaveLength(2)
  expect(totals[0]).toBeCloseTo(totals[1] ?? Number.NaN, 9)
  // ...so the only skew check, which compares totals against the pair's
  // 0.1 mm limit, reports nothing.
  const pair = circuitJson.find(
    (element): element is SourceBus => element.type === "source_bus",
  )
  expect(pair?.max_length_skew).toBe(0.1)
  expect(checkPcbBusLengthSkew(circuitJson)).toEqual([])
})
