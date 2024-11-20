import type { Meta } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../PCBViewer"

export const CoordinateFlip: React.FC = () => {
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
      <PCBViewer soup={soup} />
    </div>
  )
}

const meta: Meta<typeof CoordinateFlip> = {
  title: "CoordinateFlip",
  component: CoordinateFlip,
}

export default meta
