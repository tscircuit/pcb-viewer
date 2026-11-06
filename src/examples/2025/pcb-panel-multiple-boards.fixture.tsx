import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../../PCBViewer"

export const PcbPanelMultipleBoardsExample: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <panel width="100mm" height="50mm" layoutMode="grid">
      <board width="10mm" height="10mm" routingDisabled />
      <board width="10mm" height="10mm" routingDisabled />
      <board width="10mm" height="10mm" routingDisabled />
      <board width="10mm" height="10mm" routingDisabled />
    </panel>,
  )

  circuit.renderUntilSettled()
  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "400px" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default {
  PcbPanelMultipleBoardsExample,
}
