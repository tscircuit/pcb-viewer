import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const SpacedResistors = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor
          pcb_x="500mm"
          pcb_y="500mm"
          footprint="0805"
          resistance="10k"
        />
        <resistor
          pcb_x="540mm"
          pcb_y="510mm"
          footprint="0805"
          resistance="10k"
        />
      </PCBViewer>
    </div>
  )
}

const meta: Meta<typeof SpacedResistors> = {
  title: "Initial Centering",
  component: SpacedResistors,
  tags: [],
  argTypes: {},
}

export default meta
type Story = StoryObj<typeof SpacedResistors>
