import { PCBViewer } from "../PCBViewer"
import React from "react"

export const CornerRadius: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "rect_corner",
              shape: "rect",
              x: -3.5,
              y: 0,
              width: 2,
              height: 2,
              corner_radius: 0.25,
              layer: "top",
            },
            {
              type: "pcb_smtpad",
              pcb_smtpad_id: "rotated_corner",
              shape: "rotated_rect",
              x: 3.5,
              y: 0,
              width: 2,
              height: 2,
              ccw_rotation: 30,
              corner_radius: 0.25,
              layer: "top",
            },
            {
              type: "pcb_silkscreen_text",
              pcb_silkscreen_text_id: "label_rect",
              layer: "top",
              font: "tscircuit2024",
              font_size: 0.5,
              anchor_position: { x: -4, y: 2.5 },
              anchor_alignment: "center",
              text: "rounded rect smtpad",
            },
            {
              type: "pcb_silkscreen_text",
              pcb_silkscreen_text_id: "label_rotated",
              layer: "top",
              font: "tscircuit2024",
              font_size: 0.5,
              anchor_position: { x: 4, y: 2.5 },
              anchor_alignment: "center",
              text: "rounded rotated rect smtpad",
            },
          ] as any
        }
      />
    </div>
  )
}

export default CornerRadius
