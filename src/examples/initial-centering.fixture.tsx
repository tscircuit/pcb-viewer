import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../PCBViewer"

export const SpacedResistors = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="600mm" height="600mm">
      <resistor
        name="R1"
        pcbX="500mm"
        pcbY="500mm"
        footprint="0805"
        resistance="10k"
      />
      <resistor
        name="R2"
        pcbX="540mm"
        pcbY="510mm"
        footprint="0805"
        resistance="10k"
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

export default SpacedResistors
