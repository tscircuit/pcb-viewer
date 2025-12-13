import { useState } from "react"
import { PCBViewer } from "../../../PCBViewer"
import { AnyCircuitElement } from "circuit-json"

// Create a test component that maintains PCBViewer instance while updating circuit
const PCBViewerTransformTest = () => {
  // Initial circuit with a single resistor
  const [circuit, setCircuit] = useState([
    { type: "pcb_component", pcb_component_id: "r1", x: 0, y: 0 },
    {
      type: "pcb_smtpad",
      pcb_component_id: "r1",
      shape: "rect",
      x: -1,
      y: 0,
      width: 0.8,
      height: 1.2,
    },
    {
      type: "pcb_smtpad",
      pcb_component_id: "r1",
      shape: "rect",
      x: 1,
      y: 0,
      width: 0.8,
      height: 1.2,
    },
  ])

  // Track update count for debugging
  const [updateCount, setUpdateCount] = useState(0)

  // Add components to the right
  const addComponent = () => {
    const newX = updateCount * 5 // Place each new component 5 units to the right
    setCircuit((prev) => [
      ...prev,
      {
        type: "pcb_component",
        pcb_component_id: `r${updateCount + 2}`,
        x: newX,
        y: 0,
      },
      {
        type: "pcb_smtpad",
        pcb_component_id: `r${updateCount + 2}`,
        shape: "rect",
        x: newX - 1,
        y: 0,
        width: 0.8,
        height: 1.2,
      },
      {
        type: "pcb_smtpad",
        pcb_component_id: `r${updateCount + 2}`,
        shape: "rect",
        x: newX + 1,
        y: 0,
        width: 0.8,
        height: 1.2,
      },
    ])
    console.log(circuit, "circuit")
    setUpdateCount((c) => c + 1)
  }

  // Check if circuitJson data is properly updating
  const componentCount = circuit.filter(
    (c) => c.type === "pcb_component",
  ).length

  return (
    <div>
      <div
        style={{ padding: "10px", background: "#f0f0f0", marginBottom: "10px" }}
      >
        <h2>PCBViewer Transform Test</h2>
        <p>
          Components: {componentCount} | Updates: {updateCount}
        </p>
        <p>
          If working correctly, the view transform (zoom/pan) should NOT reset
          when adding components
        </p>
        <button
          onClick={addComponent}
          style={{
            padding: "8px 16px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Add Component
        </button>
        <p style={{ fontSize: "13px", opacity: 0.8 }}>
          1. Pan/zoom the view to a position you like
          <br />
          2. Click the button to add a component
          <br />
          3. If the view position stays the same, it's working!
        </p>
      </div>

      <div style={{ height: "500px", border: "1px solid #ddd" }}>
        <PCBViewer circuitJson={circuit as AnyCircuitElement[]} height={500} />
      </div>
    </div>
  )
}

export default PCBViewerTransformTest
