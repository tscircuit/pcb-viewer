import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../PCBViewer"

const ClickToEnableInteractionDemo: React.FC = () => {
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
      <PCBViewer circuitJson={soup as any} clickToInteractEnabled={true} />
    </div>
  )
}

export default ClickToEnableInteractionDemo
