import { type Meta } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenLine: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <component
        name="R1"
        footprint={
          <footprint>
            <silkscreenline x1={0} y1={0} x2={1} y2={1} strokeWidth={"0.1mm"} />
          </footprint>
        }
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

const meta: Meta<typeof SilkscreenLine> = {
  title: "Silkscreen",
  component: SilkscreenLine,
}

export default meta
