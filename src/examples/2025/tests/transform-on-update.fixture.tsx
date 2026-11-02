import { useState } from "react"
import { PCBViewer } from "../../../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"
import { createTransformExampleComponent } from "./create-transform-example-component"

// Create a test component that maintains PCBViewer instance while updating circuit
const PCBViewerTransformTest = () => {
  // Initial circuit with a single resistor
  const [circuit, setCircuit] = useState<AnyCircuitElement[]>([
    {
      type: "pcb_board",
      pcb_board_id: "transform_example_board",
      center: { x: 10, y: 0 },
      width: 40,
      height: 20,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    ...createTransformExampleComponent({ componentNumber: 1, pcbX: 0 }),
  ])

  // Track update count for debugging
  const [updateCount, setUpdateCount] = useState(0)

  // Add components to the right
  const addComponent = () => {
    const pcbX = (updateCount + 1) * 5
    setCircuit((prev) => [
      ...prev,
      ...createTransformExampleComponent({
        componentNumber: updateCount + 2,
        pcbX,
      }),
    ])
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
        <PCBViewer circuitJson={circuit} height={500} />
      </div>
    </div>
  )
}

export default PCBViewerTransformTest
