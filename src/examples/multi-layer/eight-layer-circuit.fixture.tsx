import React from "react"
import { PCBViewer } from "../../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

export const EightLayerCircuit: React.FC = () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 60,
      height: 25,
      material: "fr4",
      num_layers: 8,
      thickness: 1.6,
    },
    // Single pad on top layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_top",
      x: -21,
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
      x: -15,
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
      x: -9,
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
      x: -3,
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
      x: 3,
      y: 0,
      width: 2,
      height: 1,
      layer: "inner4",
      shape: "rect",
    },
    // Single pad on inner5 layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner5",
      x: 9,
      y: 0,
      width: 2,
      height: 1,
      layer: "inner5",
      shape: "rect",
    },
    // Single pad on inner6 layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner6",
      x: 15,
      y: 0,
      width: 2,
      height: 1,
      layer: "inner6",
      shape: "rect",
    },
    // Single pad on bottom layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_bottom",
      x: 21,
      y: 0,
      width: 2,
      height: 1,
      layer: "bottom",
      shape: "rect",
    },
    // Vias connecting layers sequentially
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_1",
      x: -18,
      y: 0,
      hole_diameter: 0.2,
      outer_diameter: 0.4,
      layers: ["top", "inner1"],
    },
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_2",
      x: -12,
      y: 0,
      hole_diameter: 0.2,
      outer_diameter: 0.4,
      layers: ["inner1", "inner2"],
    },
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_3",
      x: -6,
      y: 0,
      hole_diameter: 0.2,
      outer_diameter: 0.4,
      layers: ["inner2", "inner3"],
    },
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_4",
      x: 0,
      y: 0,
      hole_diameter: 0.2,
      outer_diameter: 0.4,
      layers: ["inner3", "inner4"],
    },
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_5",
      x: 6,
      y: 0,
      hole_diameter: 0.2,
      outer_diameter: 0.4,
      layers: ["inner4", "inner5"],
    },
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_6",
      x: 12,
      y: 0,
      hole_diameter: 0.2,
      outer_diameter: 0.4,
      layers: ["inner5", "inner6"],
    },
    {
      type: "pcb_via",
      pcb_via_id: "pcb_via_7",
      x: 18,
      y: 0,
      hole_diameter: 0.2,
      outer_diameter: 0.4,
      layers: ["inner6", "bottom"],
    },
    // Traces on each layer connecting pads to vias
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_top",
      route: [
        { x: -21, y: 0, width: 0.2, layer: "top" },
        { x: -18, y: 0, width: 0.2, layer: "top" },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_inner1",
      route: [
        { x: -18, y: 0, width: 0.2, layer: "inner1" },
        { x: -12, y: 0, width: 0.2, layer: "inner1" },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_inner2",
      route: [
        { x: -12, y: 0, width: 0.2, layer: "inner2" },
        { x: -6, y: 0, width: 0.2, layer: "inner2" },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_inner3",
      route: [
        { x: -6, y: 0, width: 0.2, layer: "inner3" },
        { x: 0, y: 0, width: 0.2, layer: "inner3" },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_inner4",
      route: [
        { x: 0, y: 0, width: 0.2, layer: "inner4" },
        { x: 6, y: 0, width: 0.2, layer: "inner4" },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_inner5",
      route: [
        { x: 6, y: 0, width: 0.2, layer: "inner5" },
        { x: 12, y: 0, width: 0.2, layer: "inner5" },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_inner6",
      route: [
        { x: 12, y: 0, width: 0.2, layer: "inner6" },
        { x: 18, y: 0, width: 0.2, layer: "inner6" },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_bottom",
      route: [
        { x: 18, y: 0, width: 0.2, layer: "bottom" },
        { x: 21, y: 0, width: 0.2, layer: "bottom" },
      ],
    },
  ] as any

  return (
    <div style={{ backgroundColor: "black", padding: "20px" }}>
      <div style={{ marginBottom: "20px", color: "white" }}>
        <h3>8-Layer Circuit - Simple Layout</h3>
        <p>
          This circuit has 8 layers with one pad per layer, all side by side
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          Expected layer dropdown: [top, inner1, inner2, inner3, inner4, inner5,
          inner6, bottom]
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          Layout: TOP | I1 | I2 | I3 | I4 | I5 | I6 | BOTTOM
        </p>
        <p style={{ fontSize: "12px", opacity: 0.6 }}>
          This tests the maximum layer count (8 layers) with all hotkeys 1-8
          working
        </p>
      </div>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default EightLayerCircuit
