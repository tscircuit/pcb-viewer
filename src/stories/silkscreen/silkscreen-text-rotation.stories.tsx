import type { Meta } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenTextRotation: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="11mm" height="11mm">
      <footprint>
        <silkscreentext
          text="20 degrees"
          pcbX={4}
          fontSize={0.25}
          pcbRotation={20}
          layer="top"
        />
        <silkscreentext
          text="50 degrees"
          pcbX={2}
          fontSize={0.25}
          pcbRotation={50}
          layer="top"
        />
        <silkscreentext
          text="70 degrees"
          pcbX={0}
          fontSize={0.25}
          pcbRotation={70}
          layer="top"
        />
        <silkscreentext
          text="90 degrees"
          pcbX={-2}
          fontSize={0.25}
          pcbRotation={90}
          layer="top"
        />
        <silkscreentext
          text="180 degree"
          pcbX={-4}
          fontSize={0.25}
          pcbRotation={180}
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

const meta: Meta<typeof SilkscreenTextRotation> = {
  title: "Silkscreen",
  component: SilkscreenTextRotation,
}

export default meta
