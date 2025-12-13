import type React from "react"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../PCBViewer"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "source_component",
    source_component_id: "source_component_1",
    name: "U1",
    ftype: "simple_chip",
    supplier_part_numbers: {},
  },
  {
    type: "source_component",
    source_component_id: "source_component_2",
    name: "U2",
    ftype: "simple_chip",
    supplier_part_numbers: {},
  },
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 60,
    height: 40,
    thickness: 1.6,
    num_layers: 4,
    material: "fr4",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_1",
    source_component_id: "source_component_1",
    center: { x: -10, y: -8 },
    width: 6,
    height: 3,
    layer: "top",
    rotation: 0,
    positioned_relative_to_pcb_board_id: "pcb_board_0",
    obstructs_within_bounds: true,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_u1_1",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "port_u1_1",
    shape: "rect",
    x: -11.5,
    y: -8,
    width: 1,
    height: 1.4,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_u1_2",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "port_u1_2",
    shape: "rect",
    x: -8.5,
    y: -8,
    width: 1,
    height: 1.4,
    layer: "top",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_2",
    source_component_id: "source_component_2",
    center: { x: 12, y: 10 },
    width: 6,
    height: 3,
    layer: "top",
    rotation: 0,
    positioned_relative_to_pcb_board_id: "pcb_board_0",
    obstructs_within_bounds: true,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_u2_1",
    pcb_component_id: "pcb_component_2",
    pcb_port_id: "port_u2_1",
    shape: "rect",
    x: 10.5,
    y: 10,
    width: 1,
    height: 1.4,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_u2_2",
    pcb_component_id: "pcb_component_2",
    pcb_port_id: "port_u2_2",
    shape: "rect",
    x: 13.5,
    y: 10,
    width: 1,
    height: 1.4,
    layer: "top",
  },
] as AnyCircuitElement[]

export const BoardAnchorOffsetFixture: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "100%" }}>
      <PCBViewer
        circuitJson={circuitJson}
        initialState={{ is_showing_group_anchor_offsets: true }}
      />
    </div>
  )
}

export default BoardAnchorOffsetFixture
