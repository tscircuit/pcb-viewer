import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../src/PCBViewer"

const meta: Meta<typeof PCBViewer> = {
  title: "PCBViewer/FocusOnHover",
  component: PCBViewer,
}
export default meta

type Story = StoryObj<typeof PCBViewer>

export const FocusOnHoverDisabled: Story = {
  name: "focusOnHover={false}",
  args: {
    focusOnHover: false,
    circuitJson: [],
  },
}

export const FocusOnHoverEnabled: Story = {
  name: "focusOnHover={true} (default)",
  args: {
    focusOnHover: true,
    circuitJson: [],
  },
}
