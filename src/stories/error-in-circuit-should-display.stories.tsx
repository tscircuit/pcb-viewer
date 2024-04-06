import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const ErrorInCircuit = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        {/* @ts-expect-error */}
        <resistor footprint="some-invalid-name" />
      </PCBViewer>
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
