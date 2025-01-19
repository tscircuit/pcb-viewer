import type { Meta, StoryObj } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../PCBViewer"

const HoverBehaviorDemo: React.FC<{ focusOnHover?: boolean }> = ({
  focusOnHover,
}) => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor
        name="R0"
        pcbX={-4}
        pcbY={-2}
        footprint="1210"
        resistance="10kohm"
      />
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
      <trace path={[".R1 > .right", "net.Ground"]} />
      <trace path={[".R0 > .right", "net.Ground"]} />
      <trace path={["net.Ground", ".R2 > .left"]} />
      <trace path={[".R3 > .left", ".R2 > .right"]} />
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer soup={soup} focusOnHover={focusOnHover} />
    </div>
  )
}

// Story with hover focus disabled (default behavior)
export const HoverDisabled: Story = {
  args: {
    focusOnHover: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Hover focus is disabled by default. Hovering over components and traces will not highlight them.",
      },
    },
  },
}

// Story with hover focus enabled
export const HoverEnabled: Story = {
  args: {
    focusOnHover: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Hover focus is enabled. Hovering over components and traces will highlight them and their connected elements.",
      },
    },
  },
}

const meta: Meta<typeof HoverBehaviorDemo> = {
  title: "Hover Behavior",
  component: HoverBehaviorDemo,
}

export default meta

type Story = StoryObj<typeof HoverBehaviorDemo>
