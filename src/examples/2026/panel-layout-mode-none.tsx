import React from "react"
import { PCBViewer } from "../../PCBViewer"
import { Circuit } from "@tscircuit/core"

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

export const PanelLayoutModeNone: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <panel width={100} height={100} layoutMode="none">
      {boards.map((pos, i) => (
        <board
          width={boardWidth}
          height={boardHeight}
          key={i}
          pcbX={pos.pcbX - 50 + 3 + 2}
          pcbY={pos.pcbY - 50 + 1 + 2}
        >
          <hole diameter={1} shape="circle" />
          <cutout width={1} height={1} shape="rect" />
          <resistor name="R1" resistance={1000} footprint={"0402"} />
          <pcbnotetext text="R1" pcbX={0} pcbY={0} fontSize={1} />
          {/* <silkscreentext
            text="R1"
            pcbX={0}
            pcbY={0}
            fontSize={1}
          /> */}
        </board>
      ))}
    </panel>,
  )

  circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default PanelLayoutModeNone
