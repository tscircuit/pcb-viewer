import type { Meta, StoryObj } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../PCBViewer"

const ClickToEnableZoomDemo: React.FC = () => {
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
        pcbX={4}
        pcbY={2}
        footprint="1210"
        resistance="10kohm"
      />
      <trace path={[".R0 > .right", ".R1 > .left"]} />
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer soup={soup} clickToEnableZoom={true} />
    </div>
  )
}

const meta: Meta<typeof ClickToEnableZoomDemo> = {
  title: "Features/Click to Enable Zoom",
  component: ClickToEnableZoomDemo,
}

export default meta

type Story = StoryObj<typeof ClickToEnableZoomDemo>
export const Default: Story = {}
