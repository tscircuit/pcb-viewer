import { PCBViewer } from "../../../PCBViewer"
import circuitJson from "../../../../layout.circuit.json"

export const DrillHoleBelowCopperPad = () => {
  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "100vh" }}>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default DrillHoleBelowCopperPad
