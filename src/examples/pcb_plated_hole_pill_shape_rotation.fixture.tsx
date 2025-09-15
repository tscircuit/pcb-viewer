import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../PCBViewer"

export const PcbPlatedHolePillShapeRotation: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <platedhole
        shape="pill"
        outerWidth="2mm"
        outerHeight="4mm"
        holeWidth="1mm"
        holeHeight="2mm"
        pcbX={0}
        pcbY={0}
        pcbRotation={45}
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  console.log(JSON.stringify(circuitJson, null, 2))

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default PcbPlatedHolePillShapeRotation
