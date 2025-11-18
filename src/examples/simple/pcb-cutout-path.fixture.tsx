import type React from "react"
import { PCBViewer } from "../../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

export const PcbCutoutPathExample: React.FC = () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 50,
      height: 40,
      material: "fr1",
      num_layers: 2,
      thickness: 1.2,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout1",
      shape: "path",
      route: [
        { x: 0, y: 9 },
        { x: 9, y: 9 },
        { x: 9, y: -9 },
        { x: -9, y: -9 },
        { x: -9, y: 9 },
        { x: 0, y: 9 },
      ],
      slot_width: 1,
      slot_length: 6,
      space_between_slots: 0.6,
    },
  ]

  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "400px" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default PcbCutoutPathExample
