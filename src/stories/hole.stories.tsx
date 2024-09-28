import React from "react"
import { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"
import { Circuit } from "@tscircuit/core"

export const HoleExample: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <chip
        name="U1"
        footprint={
          <footprint>
            {/* @ts-ignore */}
            <hole pcbX="2mm" pcbY="0mm" diameter="1mm" />
            <smtpad
              portHints={["1"]}
              pcbX="0mm"
              pcbY="0mm"
              shape="rect"
              width="1mm"
              height="1mm"
            />
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

const meta: Meta<typeof HoleExample> = {
  title: "Hole",
  component: HoleExample,
}

export default meta
