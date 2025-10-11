import React from "react"
import { PCBViewer } from "../../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

export const SixLayerCircuit: React.FC = () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 40,
      height: 20,
      material: "fr4",
      num_layers: 6,
      thickness: 1.6,
    },
    // Single pad on top layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_top",
      x: -15,
      y: 0,
      width: 2,
      height: 1,
      layer: "top",
      shape: "rect",
    },
    // Single pad on inner1 layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner1",
      x: -9,
      y: 0,
      width: 2,
      height: 1,
      layer: "inner1",
      shape: "rect",
    },
    // Single pad on inner2 layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner2",
      x: -3,
      y: 0,
      width: 2,
      height: 1,
      layer: "inner2",
      shape: "rect",
    },
    // Single pad on inner3 layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner3",
      x: 3,
      y: 0,
      width: 2,
      height: 1,
      layer: "inner3",
      shape: "rect",
    },
    // Single pad on inner4 layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner4",
      x: 9,
      y: 0,
      width: 2,
      height: 1,
      layer: "inner4",
      shape: "rect",
    },
    // Single pad on bottom layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_bottom",
      x: 15,
      y: 0,
      width: 2,
      height: 1,
      layer: "bottom",
      shape: "rect",
    },
  ] as any

  return (
    <div style={{ backgroundColor: "black", padding: "20px" }}>
      <div style={{ marginBottom: "20px", color: "white" }}>
        <h3>6-Layer Circuit - Simple Layout</h3>
        <p>
          This circuit has 6 layers with one pad per layer, all side by side
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          Expected layer dropdown: [top, inner1, inner2, inner3, inner4, bottom]
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          Layout: TOP | INNER1 | INNER2 | INNER3 | INNER4 | BOTTOM
        </p>
      </div>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default SixLayerCircuit
