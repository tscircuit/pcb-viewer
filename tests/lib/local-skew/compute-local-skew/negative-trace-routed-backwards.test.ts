import { expect, test } from "bun:test"
import type { PcbTrace } from "circuit-json"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderDifferentialPairBoard } from "../../../fixtures/local-skew/differential-pair-board"
import { skewAtX } from "../../../fixtures/local-skew/skew-at-x"

test("a negative trace routed from the load end gives the same skew", () => {
  const circuitJson = renderDifferentialPairBoard()
  const negativeTrace = circuitJson.find(
    (element): element is PcbTrace =>
      element.type === "pcb_trace" && element.pcb_trace_id === "pcb_trace_1",
  )
  negativeTrace?.route.reverse()

  const [pair] = computeLocalSkew(circuitJson)

  expect(skewAtX({ segments: pair.positive.segments, x: 0 })).toBeCloseTo(
    1.23607,
    4,
  )
  expect(skewAtX({ segments: pair.negative.segments, x: 0 })).toBeCloseTo(
    -1.23607,
    4,
  )
  expect(skewAtX({ segments: pair.negative.segments, x: 11 })).toBe(0)
})
