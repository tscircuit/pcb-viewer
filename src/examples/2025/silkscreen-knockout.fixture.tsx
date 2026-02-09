import type React from "react"
import { PCBViewer } from "../../PCBViewer"
import { AnyCircuitElement } from "circuit-json"

export const SilkscreenKnockoutExample: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "pcb_board",
              pcb_board_id: "board_1",
              center: { x: 0, y: 0 },
              width: 20,
              height: 20,
              thickness: 1.6,
              num_layers: 2,
            },
            // A filled rectangle on silkscreen to knockout from
            {
              type: "pcb_silkscreen_rect",
              pcb_silkscreen_rect_id: "rect_1",
              pcb_component_id: "component_1",
              center: { x: 0, y: 0 },
              width: 10,
              height: 5,
              layer: "top",
            },
            // The knockout text
            {
              type: "pcb_silkscreen_text",
              pcb_silkscreen_text_id: "text_1",
              pcb_component_id: "component_1",
              anchor_position: { x: 0, y: 0 },
              text: "KNOCKOUT",
              font_size: 1,
              layer: "top",
              anchor_alignment: "center",
              is_knockout: true,
              knockout_padding: {
                top: 0.2,
                bottom: 0.2,
                left: 0.2,
                right: 0.2,
              },
            },
            // Comparison: Normal text
            {
              type: "pcb_silkscreen_text",
              pcb_silkscreen_text_id: "text_2",
              pcb_component_id: "component_1",
              anchor_position: { x: 0, y: 4 },
              text: "NORMAL",
              font_size: 1,
              layer: "top",
              anchor_alignment: "center",
            },
          ] as AnyCircuitElement[]
        }
      />
    </div>
  )
}

export default SilkscreenKnockoutExample
