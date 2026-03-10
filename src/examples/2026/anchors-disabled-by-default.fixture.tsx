import type React from "react"
import { PCBViewer } from "../../PCBViewer"
import { AnyCircuitElement } from "circuit-json"

export const AnchorsDisabledByDefault: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        initialState={{ is_showing_pcb_groups: true }}
        circuitJson={
          [
            {
              type: "pcb_board",
              pcb_board_id: "pcb_board_0",
              center: { x: 0, y: 0 },
              width: 10,
              height: 10,
              num_layers: 2,
            },
            {
              type: "pcb_group",
              pcb_group_id: "pcb_group_0",
              name: "My Group",
              anchor_position: { x: 0, y: 0 },
              center: { x: 2, y: 2 },
              width: 2,
              height: 2,
            },
            {
              type: "pcb_component",
              pcb_component_id: "pcb_component_0",
              center: { x: 1, y: 1 },
              width: 1,
              height: 1,
              layer: "top",
              rotation: 0,
              pcb_group_id: "pcb_group_0",
              position_mode: "relative_to_group_anchor",
              positioned_relative_to_pcb_group_id: "pcb_group_0",
              display_offset_x: 1,
              display_offset_y: 1,
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "pcb_smtpad_0",
              pcb_component_id: "pcb_component_0",
              layer: "top",
              shape: "rect",
              width: 0.5,
              height: 0.5,
              x: 1,
              y: 1,
            },
          ] as AnyCircuitElement[]
        }
      />
      <div style={{ color: "white", padding: 10, fontFamily: "sans-serif" }}>
        <h3>Anchors Disabled by Default</h3>
        <p>Position anchors should NOT be visible initially.</p>
        <p>Hover over the component to see the anchor offset.</p>
        <p>
          Enable "Show Group Anchor Offsets" in the View menu to see them
          permanently.
        </p>
      </div>
    </div>
  )
}

export default AnchorsDisabledByDefault
