import React from "react"
import { PCBViewer } from "../../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

export const KeepoutMultiLayerExample = () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 30,
      height: 20,
      material: "fr4",
      num_layers: 6,
      thickness: 1.6,
    },
    // Keepout on top layer
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_top",
      layer: ["top"],
      shape: "rect",
      width: 3,
      height: 2,
      center: { x: -9, y: 0 },
    },
    // Keepout on inner1 layer
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_inner1",
      layer: ["inner1"],
      shape: "rect",
      width: 3,
      height: 2,
      center: { x: -3, y: 0 },
    },
    // Keepout on inner2 layer
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_inner2",
      layer: ["inner2"],
      shape: "circle",
      radius: 1.5,
      center: { x: 3, y: 0 },
    },
    // Keepout on inner3 layer
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_inner3",
      layer: ["inner3"],
      shape: "rect",
      width: 3,
      height: 2,
      center: { x: 9, y: 0 },
    },
    // Keepout on bottom layer
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_bottom",
      layer: ["bottom"],
      shape: "circle",
      radius: 1.5,
      center: { x: -9, y: -6 },
    },
    // Keepout spanning multiple layers (top and inner1)
    {
      type: "pcb_keepout",
      pcb_keepout_id: "pcb_keepout_multi",
      layer: ["top", "inner1"],
      shape: "rect",
      width: 2,
      height: 2,
      center: { x: -3, y: -6 },
    },
  ] as any

  return (
    <div style={{ backgroundColor: "black", padding: "20px" }}>
      <div style={{ marginBottom: "20px", color: "white" }}>
        <h3>Multi-Layer Keepout Example</h3>
        <p>
          This circuit demonstrates keepouts rendered on different copper layers
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>Expected behavior:</p>
        <ul style={{ fontSize: "14px", opacity: 0.8 }}>
          <li>Top layer: Rectangular keepout at (-9, 0)</li>
          <li>Inner1 layer: Rectangular keepout at (-3, 0)</li>
          <li>Inner2 layer: Circular keepout at (3, 0)</li>
          <li>Inner3 layer: Rectangular keepout at (9, 0)</li>
          <li>Bottom layer: Circular keepout at (-9, -6)</li>
          <li>
            Multi-layer: Rectangular keepout at (-3, -6) on both top and inner1
          </li>
        </ul>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          Switch between layers to see keepouts rendered on each layer
        </p>
      </div>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default KeepoutMultiLayerExample
