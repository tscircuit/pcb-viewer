import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../../PCBViewer"

export const EditBoardDemo = () => {
  const circuit = new Circuit()

  circuit.add(
    <board pcbX={0} pcbY={0} width="40mm" height="30mm">
      <resistor
        name="R1"
        resistance="10k"
        footprint="0402"
        pcbX={-5}
        pcbY={0}
      />
      <resistor name="R2" resistance="22k" footprint="0402" pcbX={5} pcbY={0} />
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <p
        style={{
          color: "#aaa",
          fontFamily: "sans-serif",
          padding: 8,
          margin: 0,
        }}
      >
        Click "Edit Board" in the toolbar to drag/resize the board outline.
      </p>
      <PCBViewer
        circuitJson={soup as any}
        onBoardChanged={(board, opts) => {
          console.log("Board changed:", board, opts)
        }}
      />
    </div>
  )
}

export default EditBoardDemo
