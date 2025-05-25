import type { Meta } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../PCBViewer"

export const ParentGroupHoverDemo: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <resistor
        name="R1"
        pcbX={0}
        pcbY={0}
        footprint="0402"
        resistance="10kohm"
      />
      <group name="group-1">
        <resistor
          name="R0"
          pcbX={-4}
          pcbY={-2}
          footprint="0402"
          resistance="10kohm"
        />
        <capacitor
          name="C1"
          pcbX={-4}
          pcbY={-4}
          footprint="0402"
          capacitance="100nF"
        />
      </group>
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()

  return <PCBViewer circuitJson={circuitJson} />
}

const meta: Meta<typeof ParentGroupHoverDemo> = {
  title: "Parent Group Hover",
  component: ParentGroupHoverDemo,
}

export default meta