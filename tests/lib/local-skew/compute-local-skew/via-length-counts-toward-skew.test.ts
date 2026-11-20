import { expect, test } from "bun:test"
import type { PcbTrace } from "circuit-json"
import { computeLocalSkew } from "../../../../src/lib/local-skew/compute-local-skew"
import { renderPairBoard } from "../../../fixtures/local-skew/pair-board"
import { segmentAtX } from "../../../fixtures/local-skew/segment-at-x"

test("each via adds the same length to skew as to trace_length", () => {
  // Both traces take the same path, but DN hops to the bottom layer and
  // back between x = -6 and x = 6.
  const circuitJson = renderPairBoard({
    positivePath: [],
    negativePath: [
      { x: 6, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
      { x: 18, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
    ],
    pcbTraceGap: "0.45mm",
  })
  const [positiveLength, negativeLength] = circuitJson
    .filter((element): element is PcbTrace => element.type === "pcb_trace")
    .map((trace) => trace.trace_length ?? Number.NaN)

  const [pair] = computeLocalSkew(circuitJson)

  const before = segmentAtX({ segments: pair.positive.segments, x: -9 })
  const after = segmentAtX({ segments: pair.positive.segments, x: 9 })
  expect(before.coupling).toBe("coupled")
  expect(before.skew).toBe(0)
  expect(after.coupling).toBe("coupled")
  expect(after.skew).toBeCloseTo(positiveLength - negativeLength, 5)
  expect(after.skew).toBeLessThan(0)
})
