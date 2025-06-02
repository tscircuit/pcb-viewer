import type React from "react"
import { PCBViewer } from "../../PCBViewer"
import { AnyCircuitElement } from "circuit-json"

export const PcbCutoutsExample: React.FC = () => {
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
      pcb_cutout_id: "pcb_cutout_rect_0",
      shape: "rect",
      center: { x: -10, y: 10 },
      width: 8,
      height: 5,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "pcb_cutout_circle_0",
      shape: "circle",
      center: { x: 0, y: 0 },
      radius: 4,
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "pcb_cutout_polygon_0",
      shape: "polygon",
      points: [
        { x: 10, y: -10 },
        { x: 15, y: -5 },
        { x: 5, y: -5 },
      ],
    },
    {
      type: "pcb_cutout",
      pcb_cutout_id: "pcb_cutout_polygon_star",
      shape: "polygon",
      points: [
        { x: 0, y: -11 }, // Top point
        { x: 1.176, y: -14.19 }, // Top-right inner point
        { x: 3.804, y: -13.09 }, // Right outer point
        { x: 1.902, y: -15.81 }, // Bottom-right inner point
        { x: 2.351, y: -19.02 }, // Bottom-right outer point
        { x: 0, y: -17 }, // Bottom inner point
        { x: -2.351, y: -19.02 }, // Bottom-left outer point
        { x: -1.902, y: -15.81 }, // Bottom-left inner point
        { x: -3.804, y: -13.09 }, // Left outer point
        { x: -1.176, y: -14.19 }, // Top-left inner point
      ],
    },
  ]

  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "400px" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default PcbCutoutsExample
