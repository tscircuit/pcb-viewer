import type React from "react"
import { PCBViewer } from "../../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

export const PcbCutoutCornerRadiusExample: React.FC = () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 60,
      height: 50,
      material: "fr1",
      num_layers: 2,
      thickness: 1.2,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "pcb_cutout_rect_rounded_0",
      shape: "rect",
      center: { x: -12, y: 10 },
      width: 10,
      height: 6,
      corner_radius: 2.5,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "pcb_cutout_rect_sharp_0",
      shape: "rect",
      center: { x: 12, y: 10 },
      width: 10,
      height: 6,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "pcb_cutout_rect_rounded_rotated",
      shape: "rect",
      center: { x: 0, y: -10 },
      width: 12,
      height: 5,
      corner_radius: 1.5,
      rotation: 45,
    },
  ]

  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "400px" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default PcbCutoutCornerRadiusExample
