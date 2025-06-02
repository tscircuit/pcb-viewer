import React from "react"
import { PCBViewer } from "../PCBViewer"
import { Circuit } from "@tscircuit/core"

export const ErrorInCircuit: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      {/* @ts-expect-error */}
      <resistor footprint="some-invalid-name" />
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default ErrorInCircuit
