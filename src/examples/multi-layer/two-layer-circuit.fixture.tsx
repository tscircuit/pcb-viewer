import React from "react"
import { PCBViewer } from "../../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

export const TwoLayerCircuit: React.FC = () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 15,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // Single pad on top layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_top",
      x: -5,
      y: 0,
      width: 2,
      height: 1,
      layer: "top",
      shape: "rect",
    },
    // Single pad on bottom layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_bottom",
      x: 5,
      y: 0,
      width: 2,
      height: 1,
      layer: "bottom",
      shape: "rect",
    },
    // Via connecting top to bottom
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_0",
      x: 0,
      y: 0,
      hole_diameter: 0.2,
      outer_diameter: 0.4,
      layers: ["top", "bottom"],
    },
    // Traces on each layer
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_top",
      route: [
        { x: -5, y: 0, width: 0.2, layer: "top" },
        { x: 0, y: 0, width: 0.2, layer: "top" },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_bottom",
      route: [
        { x: 0, y: 0, width: 0.2, layer: "bottom" },
        { x: 5, y: 0, width: 0.2, layer: "bottom" },
      ],
    },
  ] as any

  return (
    <div style={{ backgroundColor: "black", padding: "20px" }}>
      <div style={{ marginBottom: "20px", color: "white" }}>
        <h3>2-Layer Circuit - Simple Layout</h3>
        <p>This circuit has 2 layers with one pad per layer, side by side</p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          Expected layer dropdown: [top, bottom]
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          Layout: TOP pad | BOTTOM pad
        </p>
      </div>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default TwoLayerCircuit
