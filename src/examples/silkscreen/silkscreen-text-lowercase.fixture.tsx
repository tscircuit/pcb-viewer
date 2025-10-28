import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenTextLowercase: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={[
          {
            type: "pcb_board",
            center: { x: 0, y: 0 },
            width: 20,
            height: 10,
            subcircuit_id: "pcb_generic_component_0",
            material: "fr4",
            num_layers: 2,
            pcb_board_id: "pcb_board_0",
            thickness: 1,
            is_subcircuit: false,
          },
          {
            type: "pcb_silkscreen_text",
            layer: "top",
            pcb_silkscreen_text_id: "pcb_silkscreen_text_uppercase",
            font: "tscircuit2024",
            font_size: 1,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: 2 },
            anchor_alignment: "center",
            text: "UPPERCASE TEXT",
          },
          {
            type: "pcb_silkscreen_text",
            layer: "top",
            pcb_silkscreen_text_id: "pcb_silkscreen_text_lowercase",
            font: "tscircuit2024",
            font_size: 1,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: 0 },
            anchor_alignment: "center",
            text: "lowercase text",
          },
          {
            type: "pcb_silkscreen_text",
            layer: "top",
            pcb_silkscreen_text_id: "pcb_silkscreen_text_mixed",
            font: "tscircuit2024",
            font_size: 1,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: -2 },
            anchor_alignment: "center",
            text: "MiXeD CaSe TeXt",
          },
        ]}
      />
    </div>
  )
}

export default SilkscreenTextLowercase
