import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../../PCBViewer"
import type { BoardSizeEdit } from "../../PCBViewer"
import { useState } from "react"

export const ManualEditBoard = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="30mm" height="20mm">
      <resistor name="R1" footprint="0805" resistance="10k" pcbX={0} pcbY={0} />
    </board>,
  )

  const soup = circuit.getCircuitJson()

  const [lastEdit, setLastEdit] = useState<BoardSizeEdit | null>(null)

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={soup as any}
        onBoardSizeChanged={(edit) => setLastEdit(edit)}
      />
      {lastEdit && (
        <div
          style={{
            color: "white",
            padding: 12,
            fontFamily: "monospace",
            fontSize: 13,
          }}
        >
          Board size: {lastEdit.width.toFixed(2)}mm x{" "}
          {lastEdit.height.toFixed(2)}mm | Center: (
          {lastEdit.center.x.toFixed(2)}, {lastEdit.center.y.toFixed(2)})
        </div>
      )}
    </div>
  )
}

export const ManualEditBoardLarge = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="100mm" height="80mm">
      <resistor
        name="R1"
        footprint="0805"
        resistance="10k"
        pcbX={-20}
        pcbY={10}
      />
      <resistor
        name="R2"
        footprint="0805"
        resistance="4.7k"
        pcbX={20}
        pcbY={-10}
      />
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default {
  ManualEditBoard,
  ManualEditBoardLarge,
}
