import React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"
import { Circuit } from "@tscircuit/core"

export const ErrorInCircuit: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      {/* @ts-expect-error */}
      <resistor footprint="some-invalid-name" />
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer soup={soup} />
    </div>
  )
}

const meta: Meta<typeof ErrorInCircuit> = {
  title: "ErrorInCircuit",
  component: ErrorInCircuit,
  tags: [],
  argTypes: {},
}

export default meta

type Story = StoryObj<typeof ErrorInCircuit>
