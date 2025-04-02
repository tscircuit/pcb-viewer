import type { Meta } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const FabricationNoteText: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <footprint>
        <fabricationnotetext
          fontSize={0.4}
          pcbX={0}
          pcbY={0}
          text="Fabrication Note"
          layer="top"
        />
      </footprint>
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

const meta: Meta<typeof FabricationNoteText> = {
  title: "FabricationNote",
  component: FabricationNoteText,
}

export default meta
