import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../PCBViewer"

export const CoordinateFlip = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor
        name="R1"
        footprint="0402"
        pcbX="1mm"
        pcbY="1mm"
        resistance="1k"
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

export default CoordinateFlip
