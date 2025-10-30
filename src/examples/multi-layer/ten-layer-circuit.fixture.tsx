import { PCBViewer } from "../../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

const TenLayerCircuit = () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 70,
      height: 25,
      material: "fr4",
      num_layers: 10,
      thickness: 1.6,
    },
    // Single pad on top layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_top",
      x: -28,
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
      x: -21,
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
      x: -14,
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
      x: -7,
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
      x: 0,
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
      x: 7,
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
      x: 14,
      y: 0,
      width: 2,
      height: 1,
      layer: "inner6",
      shape: "rect",
    },
    // Single pad on inner7 layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner7",
      x: 21,
      y: 0,
      width: 2,
      height: 1,
      layer: "inner7",
      shape: "rect",
    },
    // Single pad on inner8 layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner8",
      x: 28,
      y: 0,
      width: 2,
      height: 1,
      layer: "inner8",
      shape: "rect",
    },
    // Single pad on bottom layer
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_bottom",
      x: 35,
      y: 0,
      width: 2,
      height: 1,
      layer: "bottom",
      shape: "rect",
    },
  ]

  return (
    <div style={{ backgroundColor: "black" }}>
      <div style={{ marginBottom: "20px", color: "white", padding: "20px" }}>
        <h3>10-Layer Circuit - Test Maximum Layers</h3>
        <p>
          This circuit has 10 layers with one pad per layer, all side by side
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          Expected layer dropdown: [top, inner1, inner2, inner3, inner4, inner5,
          inner6, inner7, inner8, bottom]
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          Layout: TOP | I1 | I2 | I3 | I4 | I5 | I6 | I7 | I8 | BOTTOM
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8, marginTop: "10px" }}>
          This tests 10 layers (8 inner layers) to see which layers disappear
        </p>
      </div>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default TenLayerCircuit
