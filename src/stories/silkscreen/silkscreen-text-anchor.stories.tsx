import type { Meta } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenTextAnchors: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <silkscreentext
        text="45 degrees BR"
        pcbX={2}
        fontSize={0.25}
        pcbRotation={45}
        layer="top"
        anchorAlignment="bottom_right"
      />
      <silkscreentext
        text="45 degrees C"
        fontSize={0.25}
        pcbRotation={50}
        layer="top"
        anchorAlignment="center"
      />
      <silkscreentext
        text="45 degrees TR"
        pcbX={4}
        fontSize={0.25}
        pcbRotation={45}
        layer="top"
        anchorAlignment="top_right"
      />
      <silkscreentext
        text="L45 degrees TL"
        pcbX={-4}
        fontSize={0.25}
        pcbRotation={45}
        layer="top"
        anchorAlignment="top_left"
      />
      <silkscreentext
        text="L45 degree BL"
        pcbX={-2}
        fontSize={0.25}
        pcbRotation={45}
        layer="top"
        anchorAlignment="bottom_left"
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

const meta: Meta<typeof SilkscreenTextAnchors> = {
  title: "Silkscreen",
  component: SilkscreenTextAnchors,
}

export default meta
