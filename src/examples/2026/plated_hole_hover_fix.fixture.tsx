import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../../PCBViewer"

export const PlatedHoleHoverFix = () => {
  const circuit = new Circuit()

  circuit.add(
    <board pcbX={0} pcbY={0} width="40mm" height="30mm">
      <chip
        name="U1"
        footprint="pinrow6_rows1_p2.54mm_id1mm_od1.5mm_male"
        pcbX={0}
        pcbY={0}
      />
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "100vh" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default PlatedHoleHoverFix
