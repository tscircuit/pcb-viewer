import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../PCBViewer"
import type React from "react"

export const tracesLengthTooltip: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="40mm" height="20mm">
      <chip name="U1" footprint="soic8" pcbX={-2} pcbY={4} pcbRotation={20} />
      <chip name="U2" footprint="soic8" pcbX={10} pcbY={4} pcbRotation={45} />
      <chip name="U3" footprint="soic8" pcbX={-12} pcbY={4} pcbRotation={80} />
      <chip name="U4" footprint="soic8" pcbX={-2} pcbY={-4} pcbRotation={120} />
      <chip name="U5" footprint="soic8" pcbX={10} pcbY={-4} pcbRotation={170} />
      <capacitor
        name="C1"
        capacitance={"0.1uF"}
        footprint="cap0402"
        pcbX={-12}
        pcbY={-12}
        pcbRotation={250}
        maxDecouplingTraceLength={30}
      />
      <trace maxLength={5} from=".U1 .pin1" to=".U2 .pin3" />
      <trace maxLength={30} from=".U3 .pin1" to=".U4 .pin3" />
      <trace from=".U5 .pin1" to=".C1 .pin2" />
      <trace from=".U5 .pin1" to=".U3 .pin2" />
      <trace from=".U5 .pin1" to=".U3 .pin3" />

      <trace from=".U5 .pin1" to=".U3 .pin4" />
      <trace path={[".U5 > .pin5", "net.GND"]} />
      <trace path={[".U2 > .pin5", "net.GND"]} />
      <trace path={[".C1 > .pin2", "net.GND"]} />
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default tracesLengthTooltip
