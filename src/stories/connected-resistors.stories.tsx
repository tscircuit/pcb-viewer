import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

const ConnectedResistors = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor
          name="R1"
          pcb_x={-4}
          pcb_y={0}
          footprint="1206"
          resistance="10kohm"
        />
        <resistor
          name="R2"
          pcb_x={2}
          pcb_y={3}
          footprint="0603"
          resistance="10kohm"
        />
        <resistor
          name="R3"
          pcb_x={0}
          pcb_y={6}
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
