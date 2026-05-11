import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../../PCBViewer"

export const EditBoardFixture = () => {
  const circuit = new Circuit()

  circuit.add(<board pcbX={0} pcbY={0} width="50mm" height="30mm" />)

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={soup as any}
        initialState={{ in_edit_board_mode: true }}
      />
    </div>
  )
}

export default EditBoardFixture
