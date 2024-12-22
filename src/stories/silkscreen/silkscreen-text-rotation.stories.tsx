import type { Meta } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenTextRotation: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <footprint>
        <silkscreentext
          text="20 degrees"
          pcbX={3}
          pcbY={-1}
          fontSize={0.25}
          pcbRotation={20}
          layer="top"
        />
        <silkscreentext
          text="45 degrees"
          pcbX={1}
          pcbY={-1}
          fontSize={0.25}
          pcbRotation={45}
          layer="top"
        />
        <silkscreentext
          text="80 degrees"
          pcbX={-1}
          pcbY={-1}
          fontSize={0.25}
          pcbRotation={80}
          layer="top"
        />
        <silkscreentext
          text="90 degrees"
          pcbX={-3}
          pcbY={-1}
          fontSize={0.25}
          pcbRotation={90}
          layer="top"
        />
        <silkscreentext
          text="180 degrees"
          pcbX={0}
          pcbY={1}
          fontSize={0.2599999999999999}
          pcbRotation={180}
          layer="bottom"
        />
      </footprint>
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer soup={soup} />
    </div>
  )
}

const meta: Meta<typeof SilkscreenTextRotation> = {
  title: "Silkscreen",
  component: SilkscreenTextRotation,
}

export default meta
