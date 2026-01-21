import { Circuit } from "@tscircuit/core"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { PCBViewer } from "../../PCBViewer"

const boardWidth = 6
const boardHeight = 2
const numBoardsX = 4
const numBoardsY = 4

const boards: any[] = []
for (let y = 0; y < numBoardsY; y++) {
  for (let x = 0; x < numBoardsX; x++) {
    boards.push({
      pcbX: x * boardWidth,
      pcbY: y * boardHeight,
    })
  }
}

export const PanelLayoutModeNoneExternalFootprint: React.FC = () => {
  const [circuitJson, setCircuitJson] = useState(undefined)

  const circuit = useMemo(() => {
    const circuit = new Circuit()

    circuit.add(
      <panel width={100} height={100} layoutMode="none">
        {boards.map((pos, i) => (
          <board
            width={boardWidth}
            height={boardHeight}
            key={`${pos.pcbX}-${pos.pcbY}`}
            pcbX={pos.pcbX - 50 + 3 + 2}
            pcbY={pos.pcbY - 50 + 1 + 2}
          >
            <resistor
              name="R1"
              footprint="kicad:Resistor_SMD/R_0603_1608Metric"
              resistance="1k"
              pcbX={0}
              pcbY={0}
            />
          </board>
        ))}
      </panel>,
    )

    setCircuitJson(circuit.getCircuitJson() as any)

    return circuit
  }, [])

  // Use useEffect for side effects after render
  useEffect(() => {
    circuit.renderUntilSettled().then(() => {
      setCircuitJson(circuit.getCircuitJson() as any)
    })
  }, [circuit])

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default PanelLayoutModeNoneExternalFootprint
