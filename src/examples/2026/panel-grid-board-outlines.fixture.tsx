import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../../PCBViewer"

export default function PanelGridBoardOutlines() {
  const circuit = new Circuit()

  circuit.add(
    <panel width="60mm" height="40mm" layoutMode="grid">
      <board width="15mm" height="10mm">
        <resistor name="R1" resistance="1k" footprint="0402" />
      </board>
      <board width="15mm" height="10mm">
        <capacitor name="R2" capacitance="10uF" footprint="0603" />
      </board>
      <board width="15mm" height="10mm">
        <led name="LED1" color="red" footprint="0603" />
      </board>
      <board width="15mm" height="10mm">
        <resistor name="R3" resistance="10k" footprint="0603" />
      </board>
    </panel>,
  )

  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "600px" }}>
      <PCBViewer circuitJson={circuit.getCircuitJson()} />
    </div>
  )
}
