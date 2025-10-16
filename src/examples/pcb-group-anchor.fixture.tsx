import type React from "react"
import { PCBViewer } from "../PCBViewer"

export const PcbGroupWithAnchor: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "source_component",
              source_component_id: "resistor_1",
              name: "R1",
              supplier_part_numbers: {},
            },
            {
              type: "source_component",
              source_component_id: "resistor_2",
              name: "R2",
              supplier_part_numbers: {},
            },
            {
              type: "pcb_component",
              pcb_component_id: "pcb_resistor_1",
              source_component_id: "resistor_1",
              center: { x: 0, y: 0 },
              width: 3,
              height: 1.5,
              layer: "top",
              rotation: 0,
              pcb_group_id: "group_1",
            },
            {
              type: "pcb_component",
              pcb_component_id: "pcb_resistor_2",
              source_component_id: "resistor_2",
              center: { x: 5, y: 0 },
              width: 3,
              height: 1.5,
              layer: "top",
              rotation: 0,
              pcb_group_id: "group_1",
            },
            {
              type: "source_group",
              source_group_id: "source_group_1",
              name: "Resistor Group",
            },
            {
              type: "pcb_group",
              pcb_group_id: "group_1",
              source_group_id: "source_group_1",
              name: "Resistor Group",
              center: { x: 2.5, y: 0 },
              width: 8,
              height: 2.5,
              anchor_position: { x: 2.5, y: 0 },
              anchor_alignment: "center",
              pcb_component_ids: ["pcb_resistor_1", "pcb_resistor_2"],
            },
            {
              type: "pcb_component",
              pcb_component_id: "pcb_resistor_3",
              source_component_id: "resistor_1",
              center: { x: 0, y: 5 },
              width: 3,
              height: 1.5,
              layer: "top",
              rotation: 0,
              pcb_group_id: "group_2",
            },
            {
              type: "pcb_component",
              pcb_component_id: "pcb_resistor_4",
              source_component_id: "resistor_2",
              center: { x: 5, y: 5 },
              width: 3,
              height: 1.5,
              layer: "top",
              rotation: 0,
              pcb_group_id: "group_2",
            },
            {
              type: "source_group",
              source_group_id: "source_group_2",
              name: "Another Group",
            },
            {
              type: "pcb_group",
              pcb_group_id: "group_2",
              source_group_id: "source_group_2",
              name: "Another Group",
              center: { x: 2.5, y: 5 },
              width: 8,
              height: 2.5,
              anchor_position: { x: -1.5, y: 6.25 },
              anchor_alignment: "top_left",
              pcb_component_ids: ["pcb_resistor_3", "pcb_resistor_4"],
            },
            {
              type: "pcb_component",
              pcb_component_id: "pcb_resistor_5",
              source_component_id: "resistor_1",
              center: { x: 0, y: -5 },
              width: 3,
              height: 1.5,
              layer: "top",
              rotation: 0,
              pcb_group_id: "group_3",
            },
            {
              type: "pcb_component",
              pcb_component_id: "pcb_resistor_6",
              source_component_id: "resistor_2",
              center: { x: 5, y: -5 },
              width: 3,
              height: 1.5,
              layer: "top",
              rotation: 0,
              pcb_group_id: "group_3",
            },
            {
              type: "source_group",
              source_group_id: "source_group_3",
              name: "Bottom Right Group",
            },
            {
              type: "pcb_group",
              pcb_group_id: "group_3",
              source_group_id: "source_group_3",
              name: "Bottom Right Group",
              center: { x: 2.5, y: -5 },
              width: 8,
              height: 2.5,
              anchor_position: { x: 6.5, y: -6.25 },
              anchor_alignment: "bottom_right",
              pcb_component_ids: ["pcb_resistor_5", "pcb_resistor_6"],
            },
          ] as any
        }
      />
    </div>
  )
}

export default PcbGroupWithAnchor
