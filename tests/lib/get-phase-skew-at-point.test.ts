import { expect, test } from "bun:test"
import { getPhaseSkewAtPoint } from "../../src/lib/phase-skew/get-phase-skew-at-point"

test("uses the start skew of a zero-length segment", () => {
  const point = { x: 2, y: 3 }
  expect(
    getPhaseSkewAtPoint({
      point,
      layer: "top",
      trace: {
        pcb_trace_id: "trace_1",
        segments: [
          {
            start: point,
            end: { ...point },
            layer: "top",
            width: 0.15,
            start_length_difference_mm: -0.25,
            end_length_difference_mm: -0.25,
          },
        ],
      },
    }),
  ).toBe(-0.25)
})
