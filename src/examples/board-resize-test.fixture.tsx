import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../PCBViewer"
import { useState, useMemo } from "react"

export const BoardResizeTest = () => {
  const [boardSize, setBoardSize] = useState<"small" | "medium" | "large">(
    "small",
  )
  const [showComponent, setShowComponent] = useState(false)

  // Generate circuit JSON for each board size - memoized to avoid recreation
  const soup = useMemo(() => {
    const circuit = new Circuit()

    const sizes = {
      small: { width: "10mm", height: "10mm" },
      medium: { width: "30mm", height: "30mm" },
      large: { width: "60mm", height: "60mm" },
    }

    circuit.add(
      <board width={sizes[boardSize].width} height={sizes[boardSize].height}>
        <resistor name="R1" footprint="0805" resistance="10k" />
        {boardSize === "medium" && showComponent && (
          <resistor
            name="R2"
            footprint="0805"
            resistance="20k"
            pcbX={5}
            pcbY={5}
          />
        )}
        {boardSize === "large" && (
          <>
            <resistor
              name="R3"
              footprint="0805"
              resistance="30k"
              pcbX={40}
              pcbY={20}
            />
            <resistor
              name="R4"
              footprint="0805"
              resistance="40k"
              pcbX={-40}
              pcbY={-20}
            />
          </>
        )}
      </board>,
    )

    return circuit.getCircuitJson()
  }, [boardSize, showComponent])

  return (
    <div>
      <div style={{ padding: "10px", background: "#333", color: "white" }}>
        <button onClick={() => setBoardSize("small")} style={{ margin: "5px" }}>
          Small (10mm)
        </button>
        <button
          onClick={() => setBoardSize("medium")}
          style={{ margin: "5px" }}
        >
          Medium (30mm)
        </button>
        <button onClick={() => setBoardSize("large")} style={{ margin: "5px" }}>
          Large (60mm)
        </button>
        <span style={{ marginLeft: "10px" }}>Current: {boardSize}</span>
        {boardSize === "medium" && (
          <button
            onClick={() => setShowComponent(!showComponent)}
            style={{ margin: "5px", marginLeft: "20px" }}
          >
            {showComponent ? "Hide" : "Show"} Component
          </button>
        )}
      </div>
      <div style={{ backgroundColor: "black" }}>
        <PCBViewer circuitJson={soup as any} />
      </div>
    </div>
  )
}

export default BoardResizeTest
