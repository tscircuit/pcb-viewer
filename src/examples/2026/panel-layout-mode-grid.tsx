import { PCBViewer } from "../../PCBViewer"
import { Circuit } from "@tscircuit/core"
import { AnyCircuitElement } from "circuit-json"

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

export const PanelLayoutModeGrid: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <panel width={100} height={100} layoutMode="grid">
      {boards.map((pos, i) => (
        <board width={boardWidth} height={boardHeight} key={i}>
          <resistor name="R1" footprint="0603" resistance="1k" />
        </board>
      ))}
    </panel>,
  )

  const circuitJson = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default PanelLayoutModeGrid
