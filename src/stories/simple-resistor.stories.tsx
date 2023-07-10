import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

const SimpleResistor = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor footprint="0805" resistance="10k" />
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof SimpleResistor> = {
  title: "SimpleResistor",
  component: SimpleResistor,
  tags: [],
  argTypes: {},
}

export default meta
type Story = StoryObj<typeof SimpleResistor>

export const Primary: Story = {
  args: {},
}
