import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../src/PCBViewer"

const exampleCircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
  },
]

const meta: Meta<typeof PCBViewer> = {
  title: "PCBViewer/FocusOnHover",
  component: PCBViewer,
}

export default meta

type Story = StoryObj<typeof PCBViewer>

export const FocusOnHoverEnabled: Story = {
  name: "focusOnHover={true} (default)",
  args: {
    circuitJson: exampleCircuitJson,
    focusOnHover: true,
  },
}

export const FocusOnHoverDisabled: Story = {
  name: "focusOnHover={false}",
  args: {
    circuitJson: exampleCircuitJson,
    focusOnHover: false,
  },
}
