import { PCBViewer } from "../../PCBViewer"

export const PcbPanelExample = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        initialState={{ is_showing_group_anchor_offsets: true }}
        circuitJson={[
          {
            type: "pcb_panel",
            pcb_panel_id: "pcb_panel_0",
            width: 80,
            height: 60,
            covered_with_solder_mask: false,
            center: { x: 40, y: 30 },
          },
          {
            type: "pcb_board",
            pcb_board_id: "pcb_board_0",
            center: { x: 20, y: 15 },
            width: 40,
            height: 20,
            material: "fr4",
            num_layers: 2,
            thickness: 1.6,
            pcb_panel_id: "pcb_panel_0",
            position_mode: "relative_to_panel_anchor",
            display_offset_x: "-20mm",
            display_offset_y: "-15mm",
          },
          {
            type: "pcb_smtpad",
            pcb_smtpad_id: "pcb_smtpad_0",
            layer: "top",
            shape: "rect",
            x: 20,
            y: 15,
            width: 4,
            height: 3,
          },
        ]}
      />
    </div>
  )
}

export default {
  PcbPanelExample,
}
