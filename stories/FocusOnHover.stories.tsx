import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../src/PCBViewer"

const meta: Meta<typeof PCBViewer> = {
  title: "PCBViewer/FocusOnHover",
  component: PCBViewer,
}

export default meta
type Story = StoryObj<typeof PCBViewer>

const exampleElements = [
  {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.6,
    num_layers: 2,
  },
] as any[]

/**
 * Default behavior: the viewer focuses (captures scroll/keyboard) when the
 * mouse hovers over it.
 */
export const FocusOnHoverEnabled: Story = {
  args: {
    circuitJson: exampleElements,
    focusOnHover: true,
    height: 400,
  },
}

/**
 * With `focusOnHover={false}` the viewer never steals scroll or keyboard
 * events — useful when embedding the viewer inside a scrollable page.
 * This replaces the old `disableAutoFocus` prop.
 */
export const FocusOnHoverDisabled: Story = {
  args: {
    circuitJson: exampleElements,
    focusOnHover: false,
    height: 400,
  },
}
