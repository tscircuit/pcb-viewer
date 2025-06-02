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
    <div style={{ height: "200vh", padding: "100px 0" }}>
      <div style={{ backgroundColor: "black", margin: "300px 0" }}>
        <PCBViewer circuitJson={soup as any} focusOnHover={focusOnHover} />
      </div>
    </div>
  )
}

// Story with hover focus disabled (default behavior)
export const HoverDisabled = () => {
  return <HoverBehaviorDemo focusOnHover={false} />
}

// Story with hover focus enabled
export const HoverEnabled = () => {
  return <HoverBehaviorDemo focusOnHover={true} />
}

export default {
  HoverDisabled,
  HoverEnabled,
}
