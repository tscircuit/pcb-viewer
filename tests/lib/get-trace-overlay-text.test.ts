import { describe, expect, it } from "bun:test"
import type { AnyCircuitElement, PcbTrace } from "circuit-json"
import {
  getAssociatedTraceName,
  getTraceOverlayInfo,
} from "../../src/lib/get-trace-overlay-text"

const createPcbTrace = (sourceTraceId?: string): PcbTrace => ({
  type: "pcb_trace",
  pcb_trace_id: "pcb_trace_0",
  source_trace_id: sourceTraceId,
  route: [],
})

describe("trace hover labels", () => {
  it("uses the name of an associated source net", () => {
    const pcbTrace = createPcbTrace("source_net_0")
    const elements = [
      pcbTrace,
      {
        type: "source_net",
        source_net_id: "source_net_0",
        name: "GND",
        member_source_group_ids: [],
      },
    ] as AnyCircuitElement[]

    expect(
      getTraceOverlayInfo({ primitiveElement: pcbTrace, elements }),
    ).toEqual({ text: "", name: "GND", isOverLength: false })
  })

  it("uses the name of an associated source trace", () => {
    const pcbTrace = createPcbTrace("source_trace_0")
    const elements = [
      pcbTrace,
      {
        type: "source_trace",
        source_trace_id: "source_trace_0",
        connected_source_port_ids: [],
        connected_source_net_ids: [],
        name: "clock",
      },
    ] as AnyCircuitElement[]

    expect(
      getAssociatedTraceName({ primitiveElement: pcbTrace, elements }),
    ).toBe("clock")
  })

  it("falls back to the name of a source trace's connected net", () => {
    const pcbTrace = createPcbTrace("source_trace_0")
    const elements = [
      pcbTrace,
      {
        type: "source_trace",
        source_trace_id: "source_trace_0",
        connected_source_port_ids: [],
        connected_source_net_ids: ["source_net_0"],
      },
      {
        type: "source_net",
        source_net_id: "source_net_0",
        name: "VCC",
        member_source_group_ids: [],
      },
    ] as AnyCircuitElement[]

    expect(
      getAssociatedTraceName({ primitiveElement: pcbTrace, elements }),
    ).toBe("VCC")
  })

  it("does not create an overlay for a trace without hover text", () => {
    const pcbTrace = createPcbTrace()

    expect(
      getTraceOverlayInfo({ primitiveElement: pcbTrace, elements: [pcbTrace] }),
    ).toBeNull()
  })
})
