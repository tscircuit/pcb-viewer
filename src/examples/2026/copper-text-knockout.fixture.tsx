import type { AnyCircuitElement } from "circuit-json"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const CopperTextKnockout: React.FC = () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_copper_text",
      pcb_copper_text_id: "copper_text_knockout_0",
      pcb_component_id: "comp0",
      font: "tscircuit2024",
      font_size: 1,
      text: "KNOCKOUT",
      layer: "top",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      is_knockout: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad0",
      shape: "rect",
      layer: "bottom",
      x: 0,
      y: 0,
      width: 8,
      height: 1,
    },
  ]

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default CopperTextKnockout
