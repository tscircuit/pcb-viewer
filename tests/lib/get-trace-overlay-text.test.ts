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

  it("prefers a trace name over its pad selector display name", () => {
    const pcbTrace = {
      ...createPcbTrace("source_trace_0"),
      trace_length: 1.25,
    }
    const elements = [
      pcbTrace,
      {
        type: "source_trace",
        source_trace_id: "source_trace_0",
        connected_source_port_ids: [],
        connected_source_net_ids: [],
        name: "clock",
        display_name: "U1.1 to U2.2",
      },
    ] as AnyCircuitElement[]

    expect(
      getTraceOverlayInfo({ primitiveElement: pcbTrace, elements }),
    ).toEqual({ text: "1.250 mm", name: "clock", isOverLength: false })
  })

  it("falls back to the pad selector display name", () => {
    const pcbTrace = createPcbTrace("source_trace_0")
    const elements = [
      pcbTrace,
      {
        type: "source_trace",
        source_trace_id: "source_trace_0",
        connected_source_port_ids: [],
        connected_source_net_ids: [],
        display_name: "U1.1 to U2.2",
      },
    ] as AnyCircuitElement[]

    expect(
      getTraceOverlayInfo({ primitiveElement: pcbTrace, elements }),
    ).toEqual({
      text: "",
      name: "U1.1 to U2.2",
      isOverLength: false,
    })
  })

  it("only includes the unit when a trace length is present", () => {
    const pcbTrace = createPcbTrace("source_trace_0")
    const elements = [
      pcbTrace,
      {
        type: "source_trace",
        source_trace_id: "source_trace_0",
        connected_source_port_ids: [],
        connected_source_net_ids: [],
        max_length: 5,
        display_name: "U1.1 to U2.2",
      },
    ] as AnyCircuitElement[]

    expect(
      getTraceOverlayInfo({ primitiveElement: pcbTrace, elements }),
    ).toEqual({
      text: "",
      name: "U1.1 to U2.2",
      isOverLength: false,
    })
  })

  it("formats measured and maximum trace lengths together", () => {
    const pcbTrace = {
      ...createPcbTrace("source_trace_0"),
      trace_length: 5.125,
    }
    const elements = [
      pcbTrace,
      {
        type: "source_trace",
        source_trace_id: "source_trace_0",
        connected_source_port_ids: [],
        connected_source_net_ids: [],
        max_length: 5,
      },
    ] as AnyCircuitElement[]

    expect(
      getTraceOverlayInfo({ primitiveElement: pcbTrace, elements }),
    ).toEqual({ text: "5.125 / 5 mm", name: null, isOverLength: true })
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
