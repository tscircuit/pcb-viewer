import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../PCBViewer"

const positions = [
  { name: "A", x: -10, y: 3 },
  { name: "B", x: -3, y: 3 },
  { name: "C", x: 6, y: 3 },
  { name: "D", x: -3, y: -4 },
  { name: "E", x: 6, y: -4 },
]

export const ratsNestCircuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 30,
    height: 16,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  ...positions.flatMap(({ name, x, y }, index): AnyCircuitElement[] => [
    {
      type: "source_component",
      source_component_id: `source_component_${index}`,
      ftype: "simple_chip",
      name,
    },
    {
      type: "source_port",
      source_port_id: `source_port_${index}`,
      source_component_id: `source_component_${index}`,
      name: "1",
      pin_number: 1,
    },
    {
      type: "pcb_component",
      pcb_component_id: `pcb_component_${index}`,
      source_component_id: `source_component_${index}`,
      center: { x, y },
      width: 2,
      height: 2,
      obstructs_within_bounds: false,
      rotation: 0,
      layer: "top",
    },
    {
      type: "pcb_port",
      pcb_port_id: `pcb_port_${index}`,
      source_port_id: `source_port_${index}`,
      pcb_component_id: `pcb_component_${index}`,
      x,
      y,
      layers: ["top"],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: `pcb_smtpad_${index}`,
      pcb_component_id: `pcb_component_${index}`,
      pcb_port_id: `pcb_port_${index}`,
      shape: "circle",
      x,
      y,
      radius: 0.45,
      layer: "top",
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: `pcb_silkscreen_text_${index}`,
      pcb_component_id: `pcb_component_${index}`,
      anchor_position: { x, y: y + 1.5 },
      anchor_alignment: "center",
      text: name,
      font: "tscircuit2024",
      font_size: 1,
      ccw_rotation: 0,
      layer: "top",
    },
  ]),
  {
    type: "source_trace",
    source_trace_id: "source_trace_0",
    connected_source_port_ids: [
      "source_port_0",
      "source_port_1",
      "source_port_2",
    ],
    connected_source_net_ids: [],
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_1",
    connected_source_port_ids: ["source_port_3", "source_port_4"],
    connected_source_net_ids: [],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_0",
    source_trace_id: "source_trace_0",
    route: [
      {
        route_type: "wire",
        x: -10,
        y: 3,
        width: 0.4,
        layer: "top",
        start_pcb_port_id: "pcb_port_0",
      },
      {
        route_type: "wire",
        x: -3,
        y: 3,
        width: 0.4,
        layer: "top",
        end_pcb_port_id: "pcb_port_1",
      },
    ],
  },
]

export const UnconnectedRatsNest = () => (
  <div style={{ padding: 16, background: "#141414", color: "white" }}>
    <p>A–B is routed. C still needs B; D–E is a separate unrouted net.</p>
    <PCBViewer
      circuitJson={ratsNestCircuit}
      height={500}
      initialState={{
        is_showing_rats_nest: true,
        is_showing_only_unconnected_rats_nest: true,
      }}
    />
  </div>
)

export default UnconnectedRatsNest
