import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const RotatedResistors0402: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <silkscreentext
        text="KNOCKOUT"
        pcbX={0}
        pcbY={0}
        fontSize={1}
        anchorAlignment="center"
        isKnockout={true}
      />
      <smtpad
        pcbX={0}
        pcbY={0}
        width="8mm"
        height="1mm"
        layer="top"
        shape="rect"
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

export default RotatedResistors0402
