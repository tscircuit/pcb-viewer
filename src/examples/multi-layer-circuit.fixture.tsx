import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../PCBViewer"

export const MultiLayerCircuit: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor
        name="R1"
        resistance="10k"
        pcbX={-2}
        pcbY={0}
        footprint="0402"
      />
      <resistor
        name="R2"
        resistance="10k"
        pcbX={2}
        pcbY={0}
        footprint="0402"
        layer="bottom"
      />
      <trace
        path={[".R1 > .right", ".R2 > .left"]}
        pcbRouteHints={[{ x: 0, y: 0, via: true }]}
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

export default MultiLayerCircuit
