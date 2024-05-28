import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

const ConnectedResistors = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
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
        <trace path={[".R1 > .right", ".R2 > .left", ".R3 > .left"]} />
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof ConnectedResistors> = {
  title: "ConnectedResistors",
  component: ConnectedResistors,
  tags: [],
  argTypes: {},
}

export default meta
type Story = StoryObj<typeof ConnectedResistors>

export const Primary: Story = {
  args: {},
}
