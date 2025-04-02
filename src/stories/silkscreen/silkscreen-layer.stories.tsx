import type { Meta } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"
import { SilkscreenTextAnchors } from "./silkscreen-text-anchor.stories"

export const Silkscreenlayers: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <resistor
        pcbX={1}
        name="R1"
        footprint="0402"
        resistance="10k"
        layer={"bottom"}
      />
      <resistor name="R2" footprint="0402" resistance="10k" layer={"top"} />
      <footprint>
        <silkscreencircle layer="top" radius={0.5} />
        <silkscreenline
          layer="bottom"
          x1={0}
          y1={0}
          x2={-1}
          y2={1}
          strokeWidth={"0.1mm"}
        />
        <silkscreentext layer="top" text="Hello World" fontSize={1} />
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

const meta: Meta<typeof Silkscreenlayers> = {
  title: "Silkscreen",
  component: Silkscreenlayers,
}

export default meta
