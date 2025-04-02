import type { Meta, StoryObj } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../PCBViewer"

const TraceAndNet: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor
        name="R0"
        pcbX={-4}
        pcbY={-2}
        footprint="1210"
        resistance="10kohm"
      />
      <resistor
        name="R1"
        pcbX={-4}
        pcbY={0}
        footprint="1210"
        resistance="10kohm"
      />
      <resistor
        name="R2"
        pcbX={2}
        pcbY={3}
        footprint="0603"
        resistance="10kohm"
      />
      <resistor
        name="R3"
        pcbX={0}
        pcbY={6}
        footprint="0805"
        resistance="10kohm"
      />
      <trace path={[".R1 > .right", "net.Ground"]} />
      <trace path={[".R0 > .right", "net.Ground"]} />
      <trace path={["net.Ground", ".R2 > .left"]} />
      <trace path={[".R3 > .left", ".R2 > .right"]} />
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

const meta: Meta<typeof TraceAndNet> = {
  title: "Trace and Net",
  component: TraceAndNet,
  tags: [],
  argTypes: {},
}

export default meta

type Story = StoryObj<typeof TraceAndNet>

export const Primary: Story = {
  args: {},
}
