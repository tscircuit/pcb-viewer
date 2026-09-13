import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getConnectivityMapForHover } from "../../src/lib/get-connectivity-map-for-hover"

test("does not merge unrelated nets through an attributed two-ended PCB trace", () => {
  const elements = [
    {
      type: "source_trace",
      source_trace_id: "source_trace_gnd_a",
      connected_source_port_ids: ["source_port_gnd_a"],
      connected_source_net_ids: ["source_net_gnd"],
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_gnd_b",
      connected_source_port_ids: ["source_port_gnd_b"],
      connected_source_net_ids: ["source_net_gnd"],
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_vbat",
      connected_source_port_ids: ["source_port_vbat"],
      connected_source_net_ids: ["source_net_vbat"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_gnd_a",
      pcb_component_id: "pcb_component_gnd_a",
      source_port_id: "source_port_gnd_a",
      layers: ["top"],
      x: 0,
      y: 0,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_gnd_b",
      pcb_component_id: "pcb_component_gnd_b",
      source_port_id: "source_port_gnd_b",
      layers: ["top"],
      x: 5,
      y: 0,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_vbat",
      pcb_component_id: "pcb_component_vbat",
      source_port_id: "source_port_vbat",
      layers: ["top"],
      x: 0,
      y: 5,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_gnd",
      connection_name: "source_net_gnd",
      // This reproduces the misleading attribution emitted on an autorouted
      // MST segment in seveibar/nrf52810.
      source_trace_id: "source_trace_vbat",
      route: [
        {
          route_type: "wire",
          x: 0,
          y: 0,
          width: 0.15,
          layer: "top",
          start_pcb_port_id: "pcb_port_gnd_a",
        },
        {
          route_type: "wire",
          x: 5,
          y: 0,
          width: 0.15,
          layer: "top",
          end_pcb_port_id: "pcb_port_gnd_b",
        },
      ],
    },
  ] as AnyCircuitElement[]

  const connectivityMap = getConnectivityMapForHover(elements)

  expect(
    connectivityMap.areIdsConnected("pcb_trace_gnd", "pcb_port_gnd_a"),
  ).toBe(true)
  expect(
    connectivityMap.areIdsConnected("pcb_trace_gnd", "pcb_port_gnd_b"),
  ).toBe(true)
  expect(
    connectivityMap.areIdsConnected("pcb_trace_gnd", "pcb_port_vbat"),
  ).toBe(false)
})
