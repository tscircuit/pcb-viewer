import { Circuit } from "@tscircuit/core"
import type { PcbComponent } from "circuit-json"
import { PCBViewer } from "../../PCBViewer"

const circuit = new Circuit()

circuit.add(
  <board width="30mm" height="20mm">
    <chip name="J_CAM" footprint="soic8" pcbX={-7} pcbY={6} />
    <chip name="J_SD" footprint="soic8" pcbX={7} pcbY={-6} />
  </board>,
)

const circuitJson = circuit.getCircuitJson()
const pcbComponents = circuitJson.filter(
  (element): element is PcbComponent => element.type === "pcb_component",
)

const connectorWarnings = [
  {
    component: pcbComponents[0],
    facingDirection: "y-",
    recommendedFacingDirection: "y+",
  },
  {
    component: pcbComponents[1],
    facingDirection: "y+",
    recommendedFacingDirection: "y-",
  },
] as const

for (const [index, warning] of connectorWarnings.entries()) {
  if (!warning.component) continue

  circuitJson.push({
    type: "pcb_connector_not_in_accessible_orientation_warning",
    warning_type: "pcb_connector_not_in_accessible_orientation_warning",
    pcb_connector_not_in_accessible_orientation_warning_id: `pcb_connector_not_in_accessible_orientation_warning_${index}`,
    message: `component is facing ${warning.facingDirection} but should face ${warning.recommendedFacingDirection}`,
    pcb_component_id: warning.component.pcb_component_id,
    source_component_id: warning.component.source_component_id,
    facing_direction: warning.facingDirection,
    recommended_facing_direction: warning.recommendedFacingDirection,
  })
}

export default () => (
  <div style={{ backgroundColor: "black" }}>
    <PCBViewer circuitJson={circuitJson} />
  </div>
)
