import { PCBViewer } from "../../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

const OverlappingLayersTest = () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 30,
      height: 20,
      material: "fr4",
      num_layers: 8,
      thickness: 1.6,
    },
    // All pads at the SAME position to test z-index stacking
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_top",
      x: 0,
      y: 0,
      width: 5,
      height: 5,
      layer: "top",
      shape: "rect",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner1",
      x: 0,
      y: 0,
      width: 4.5,
      height: 4.5,
      layer: "inner1",
      shape: "rect",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner2",
      x: 0,
      y: 0,
      width: 4,
      height: 4,
      layer: "inner2",
      shape: "rect",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner3",
      x: 0,
      y: 0,
      width: 3.5,
      height: 3.5,
      layer: "inner3",
      shape: "rect",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner4",
      x: 0,
      y: 0,
      width: 3,
      height: 3,
      layer: "inner4",
      shape: "rect",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner5",
      x: 0,
      y: 0,
      width: 2.5,
      height: 2.5,
      layer: "inner5",
      shape: "rect",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_inner6",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      layer: "inner6",
      shape: "rect",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_bottom",
      x: 0,
      y: 0,
      width: 1.5,
      height: 1.5,
      layer: "bottom",
      shape: "rect",
    },
  ]

  return (
    <div style={{ backgroundColor: "black" }}>
      <div style={{ marginBottom: "20px", color: "white", padding: "20px" }}>
        <h3>Overlapping Layers Z-Index Test</h3>
        <p>
          All 8 layers have pads at the SAME position (0, 0) with decreasing
          sizes
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8, marginTop: "10px" }}>
          <strong>How to verify:</strong>
        </p>
        <ul style={{ fontSize: "14px", opacity: 0.8, marginLeft: "20px" }}>
          <li>
            Select "top" layer - You should see the RED top pad (largest) fully
            opaque on top
          </li>
          <li>
            Select "inner1" - You should see the GREEN inner1 pad fully opaque
            on top
          </li>
          <li>
            Select "inner2" - You should see the ORANGE inner2 pad fully opaque
            on top
          </li>
          <li>
            Continue testing each layer - the selected layer should ALWAYS be on
            top
          </li>
          <li>All other layers should be visible at 50% opacity beneath</li>
        </ul>
        <p style={{ fontSize: "14px", opacity: 0.8, marginTop: "10px" }}>
          Use hotkeys 1-8 or the layer dropdown to switch between layers
        </p>
      </div>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default OverlappingLayersTest
