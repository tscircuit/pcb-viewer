import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getPhaseSkewFullScaleMmBySourceBusId } from "../../src/lib/get-phase-skew-full-scale-mm-by-source-bus-id"

test("maps only the buses that set max_length_skew", () => {
  const elements = [
    {
      type: "source_bus",
      source_bus_id: "source_bus_0",
      source_trace_ids: [],
      max_length_skew: 0.5,
    },
    { type: "source_bus", source_bus_id: "source_bus_1", source_trace_ids: [] },
    {
      type: "source_bus",
      source_bus_id: "source_bus_2",
      source_trace_ids: [],
      max_length_skew: 0,
    },
  ] as AnyCircuitElement[]

  expect(getPhaseSkewFullScaleMmBySourceBusId(elements)).toEqual({
    source_bus_0: 0.5,
    source_bus_2: 0,
  })
})
