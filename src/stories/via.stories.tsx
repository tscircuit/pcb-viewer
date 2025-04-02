import type { Meta } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../PCBViewer"

export const ViaExample: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <via
        pcbX="0mm"
        pcbY="0mm"
        holeDiameter="1mm"
        outerDiameter="2mm"
        fromLayer="top"
        toLayer="bottom"
        // @ts-ignore
        name="V1"
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

const meta: Meta<typeof ViaExample> = {
  title: "Via",
  component: ViaExample,
}

export default meta
