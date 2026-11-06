import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { computeRatsNestLines } from "../src/components/RatsNestOverlay"

test("computeRatsNestLines handles non-numeric element IDs without throwing", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_port",
      source_port_id: "sp_left",
      name: "pin1",
    },
    {
      type: "source_port",
      source_port_id: "sp_right",
      name: "pin2",
    },
    {
      type: "source_trace",
      source_trace_id: "st_main",
      connected_source_port_ids: ["sp_left", "sp_right"],
      connected_source_net_ids: ["net_vcc"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pp_left",
      source_port_id: "sp_left",
      pcb_component_id: "pcb_component_0",
      layers: ["top"],
      x: -5,
      y: 0,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pp_right",
      source_port_id: "sp_right",
      pcb_component_id: "pcb_component_1",
      layers: ["top"],
      x: 5,
      y: 0,
    },
  ]

  const connectivityMap = getFullConnectivityMapFromCircuitJson(soup)
  const lines = computeRatsNestLines({
    soup,
    netMap: connectivityMap.netMap,
    idToNetMap: connectivityMap.idToNetMap,
  })

  expect(lines).toHaveLength(2)
  expect(lines[0]).toEqual({
    key: "pp_left-0",
    startPoint: { x: -5, y: 0 },
    endPoint: { x: 5, y: 0 },
    isInNet: true,
  })
  expect(lines[1]).toEqual({
    key: "pp_right-1",
    startPoint: { x: 5, y: 0 },
    endPoint: { x: -5, y: 0 },
    isInNet: true,
  })
})

test("computeRatsNestLines ignores a port's own slightly offset pad or plated hole when finding nearest net point", () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "source_port",
      source_port_id: "source_port_0",
      name: "pin1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_1",
      name: "pin2",
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_0",
      connected_source_port_ids: ["source_port_0", "source_port_1"],
      connected_source_net_ids: [],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_0",
      source_port_id: "source_port_0",
      pcb_component_id: "pcb_component_0",
      layers: ["top", "bottom"],
      x: 0.5,
      y: 0,
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pcb_plated_hole_0",
      pcb_port_id: "pcb_port_0",
      pcb_component_id: "pcb_component_0",
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      hole_diameter: 0.8,
      rect_pad_width: 2,
      rect_pad_height: 2,
      hole_offset_x: 0.5,
      hole_offset_y: 0,
      x: 0,
      y: 0,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      source_port_id: "source_port_1",
      pcb_component_id: "pcb_component_1",
      layers: ["top"],
      x: 10,
      y: 0,
    },
  ]

  const connectivityMap = getFullConnectivityMapFromCircuitJson(soup)
  const lines = computeRatsNestLines({
    soup,
    netMap: connectivityMap.netMap,
    idToNetMap: connectivityMap.idToNetMap,
  })

  expect(lines).toHaveLength(2)
  expect(lines[0]?.startPoint).toEqual({ x: 0.5, y: 0 })
  expect(lines[0]?.endPoint).toEqual({ x: 10, y: 0 })
})
