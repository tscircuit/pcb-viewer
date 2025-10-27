import { PCBViewer } from "../PCBViewer"

export const PcbPanelExample = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={[
          {
            type: "pcb_panel",
            pcb_panel_id: "pcb_panel_0",
            width: 80,
            height: 60,
            covered_with_solder_mask: false,
          },
          {
            type: "pcb_board",
            pcb_board_id: "pcb_board_0",
            center: { x: 40, y: 30 },
            width: 40,
            height: 20,
            material: "fr4",
            num_layers: 2,
            thickness: 1.6,
          },
          {
            type: "pcb_smtpad",
            pcb_smtpad_id: "pcb_smtpad_0",
            layer: "top",
            shape: "rect",
            x: 40,
            y: 30,
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
