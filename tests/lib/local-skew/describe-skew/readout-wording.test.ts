import { expect, test } from "bun:test"
import type {
  LocalSkewPair,
  LocalSkewSegment,
} from "../../../../src/lib/local-skew/compute-local-skew"
import { describeSkew } from "../../../../src/lib/local-skew/describe-skew"

const pair: LocalSkewPair = {
  source_bus_id: "source_bus_0",
  name: "USB",
  positive: {
    pcb_trace_id: "pcb_trace_0",
    segments: [],
    scale: { positive: 0, negative: 0 },
  },
  negative: {
    pcb_trace_id: "pcb_trace_1",
    segments: [],
    scale: { positive: 0, negative: 0 },
  },
  max_skew: 1.23607,
  max_length_skew: 0.1,
}

/** A segment with the given skew and coupling. */
function segment(
  skew: number | null,
  coupling: LocalSkewSegment["coupling"],
): LocalSkewSegment {
  return {
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
    layer: "top",
    width: 0.15,
    skew,
    coupling,
  }
}

test("the readout says how far ahead or behind the trace is and how that is known", () => {
  expect(describeSkew({ pair, segment: segment(1.23607, "coupled") })).toBe(
    "USB: 1.236 mm longer than its partner (measured) · max 1.236 mm · limit 0.100 mm",
  )
  expect(describeSkew({ pair, segment: segment(-0.5, "interpolated") })).toBe(
    "USB: 0.500 mm shorter than its partner (interpolated) · max 1.236 mm · limit 0.100 mm",
  )
  // Below the readout's 1 µm precision counts as in step.
  expect(describeSkew({ pair, segment: segment(0.0004, "coupled") })).toBe(
    "USB: in step with its partner (measured) · max 1.236 mm · limit 0.100 mm",
  )
  expect(
    describeSkew({
      pair: {
        ...pair,
        name: undefined,
        max_skew: null,
        max_length_skew: undefined,
      },
      segment: segment(null, "unknown"),
    }),
  ).toBe("Pair: skew unknown (traces not running together)")
})
