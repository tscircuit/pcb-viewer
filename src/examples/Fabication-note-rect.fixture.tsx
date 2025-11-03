import { PCBViewer } from "../PCBViewer"
import React from "react"

export const FabricationNoteRect: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "pcb_fabrication_note_rect",
              pcb_fabrication_note_rect_id: "pcb_fabrication_note_rect_0",
              pcb_component_id: null,
              center: { x: -5, y: -5 },
              width: 6,
              height: 4,
              stroke_width: 0.2,
              is_filled: true,
              is_stroke_dashed: true,
              layer: "top",
              corner_radius: 0.3,
            },
            {
              type: "pcb_fabrication_note_rect",
              pcb_fabrication_note_rect_id: "pcb_fabrication_note_rect_1",
              pcb_component_id: null,
              center: { x: -6, y: 6 },
              width: 5,
              height: 3,
              stroke_width: 0.3,
              is_filled: true,
              color: "#0000ff",
              layer: "top",
              corner_radius: 0.2,
            },
          ] as any
        }
      />
    </div>
  )
}

export default FabricationNoteRect
