import type { Meta, StoryObj } from "@storybook/react"
import { PCBViewer } from "../src/PCBViewer"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
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

/**
 * Default behavior: viewer auto-focuses (zooms/pans) when the user hovers over it.
 */
export const FocusOnHoverEnabled: Story = {
  args: {
    circuitJson: circuitJson as any,
    focusOnHover: true,
    height: 500,
  },
}

/**
 * Pass `focusOnHover={false}` to disable the auto-focus-on-hover behavior.
 * Previously this was `disableAutoFocus={true}` (now deprecated).
 */
export const FocusOnHoverDisabled: Story = {
  args: {
    circuitJson: circuitJson as any,
    focusOnHover: false,
    height: 500,
  },
}

/**
 * @deprecated Demonstrates backward compatibility with the old `disableAutoFocus` prop.
 * Prefer `focusOnHover={false}` going forward.
 */
export const LegacyDisableAutoFocus: Story = {
  args: {
    circuitJson: circuitJson as any,
    disableAutoFocus: true,
    height: 500,
  },
}
