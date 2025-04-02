import type { Meta } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import { svgAlphabet } from "assets/alphabet"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenTextAlphabet: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <footprint>
        <silkscreentext
          text={Object.keys(svgAlphabet).join("")}
          pcbX={0}
          pcbY={0}
          anchorAlignment="bottom_left"
          fontSize={0.25}
          pcbRotation={0}
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

const meta: Meta<typeof SilkscreenTextAlphabet> = {
  title: "Silkscreen",
  component: SilkscreenTextAlphabet,
}

export default meta
