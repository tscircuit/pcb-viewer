import { PCBViewer } from "../PCBViewer"
import React from "react"

export const FabricationNoteDimension: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={
          [
            {
              type: "pcb_fabrication_note_dimension" as const,
              pcb_fabrication_note_dimension_id: "fab_dimension_1",
              pcb_component_id: "pcb_component_id_1",
              from: { x: 0, y: 0 },
              to: { x: 12, y: 0 },
              text: "12.00 mm",
              font: "tscircuit2024" as const,
              font_size: 1.2,
              arrow_size: 0.8,
              layer: "top" as const,
            },
            {
              type: "pcb_fabrication_note_dimension" as const,
              pcb_fabrication_note_dimension_id: "fab_dimension_2",
              from: { x: 2, y: 2 },
              to: { x: 6, y: 6 },
              text: "5.66 mm",
              font: "tscircuit2024" as const,
              font_size: 1,
              arrow_size: 0.6,
              color: "rgba(0, 255, 255, 0.9)",
              layer: "top" as const,
              pcb_component_id: "pcb_component_1",
            },
          ] as any
        }
      />
    </div>
  )
}

export default FabricationNoteDimension
