import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const RotatedResistors0402: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor
        name="R1"
        footprint="0402"
        resistance="10k"
        pcbX={-2}
        pcbY={0}
        pcbRotation={45}
      />
      <resistor
        name="R2"
        footprint="0402"
        resistance="10k"
        pcbX={2}
        pcbY={0}
        pcbRotation={90}
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
