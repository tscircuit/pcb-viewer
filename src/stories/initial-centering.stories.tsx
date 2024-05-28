import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../PCBViewer"

export const SpacedResistors = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor
          name="R1"
          pcbX="500mm"
          pcbY="500mm"
          footprint="0805"
          resistance="10k"
        />
        <resistor
          name="R2"
          pcbX="540mm"
          pcbY="510mm"
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
