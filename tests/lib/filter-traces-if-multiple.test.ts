import { expect, it } from "bun:test";
import type { AnyCircuitElement, PcbTrace } from "circuit-json";
import type { HighlightedPrimitive } from "../../src/components/MouseElementTracker";
import { filterTracesIfMultiple } from "../../src/lib/filter-traces-if-multiple";

it("keeps named trace overlays visible when ordinary trace lengths are hidden", () => {
  const pcbTrace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_0",
    source_trace_id: "source_net_0",
    route: [],
  };
  const elements = [
    pcbTrace,
    {
      type: "source_net",
      source_net_id: "source_net_0",
      name: "GND",
      member_source_group_ids: [],
    },
  ] as AnyCircuitElement[];
  const primitive = {
    _element: pcbTrace,
  } as HighlightedPrimitive;

  expect(
    filterTracesIfMultiple({
      primitives: [primitive],
      is_showing_multiple_traces_length: false,
      elements,
    }),
  ).toEqual([primitive]);
});
