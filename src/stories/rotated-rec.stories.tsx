import type { Meta } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import type { PcbTraceError } from "circuit-json"
import type React from "react"
import { PCBViewer } from "../PCBViewer"

export const rotatedRec: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="40mm" height="20mm">
      <chip name="U1" footprint="soic8" pcbX={-2} pcbY={4} pcbRotation={20} />
      <chip name="U2" footprint="soic8" pcbX={10} pcbY={4} pcbRotation={45} />
      <chip name="U3" footprint="soic8" pcbX={-12} pcbY={4} pcbRotation={80} />
      <chip name="U4" footprint="soic8" pcbX={-2} pcbY={-4} pcbRotation={120} />
      <chip name="U5" footprint="soic8" pcbX={10} pcbY={-4} pcbRotation={170} />
      <chip
        name="U6"
        footprint="soic8"
        pcbX={-12}
        pcbY={-4}
        pcbRotation={250}
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

const meta: Meta<typeof rotatedRec> = {
  title: "RotatedRec",
  component: rotatedRec,
}

export default meta
