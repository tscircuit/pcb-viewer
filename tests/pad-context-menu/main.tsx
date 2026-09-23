import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../src/index"
import { scene } from "../x-ray-net/scene"
import type { AnyCircuitElement } from "circuit-json"

const circuitJson = [
  ...scene.map((element) =>
    element.type === "pcb_plated_hole"
      ? { ...element, pcb_component_id: "shared_component" }
      : element,
  ),
  {
    type: "source_component",
    source_component_id: "source_u1",
    ftype: "simple_chip",
    name: "U1",
    manufacturer_part_number: "ATMEGA328P-AU",
  },
  {
    type: "pcb_component",
    pcb_component_id: "shared_component",
    source_component_id: "source_u1",
    center: { x: -10, y: 0 },
    width: 4,
    height: 4,
    rotation: 0,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "unconnected_pad",
    pcb_component_id: "shared_component",
    shape: "rect",
    layer: "top",
    x: -10,
    y: 8,
    width: 2,
    height: 2,
  },
] as AnyCircuitElement[]
const params = new URLSearchParams(location.search)
if (params.has("no-mpn")) {
  const component = circuitJson.find((e) => e.type === "source_component")!
  if (component.type === "source_component")
    delete component.manufacturer_part_number
}
createRoot(document.getElementById("root")!).render(
  <PCBViewer
    circuitJson={circuitJson}
    renderer="canvas"
    height={600}
    onViewSchematicComponent={
      params.has("no-handler")
        ? undefined
        : (event) => {
            document.body.dataset.schematicEvent = JSON.stringify(event)
            document.body.dataset.callbackCount = String(
              Number(document.body.dataset.callbackCount ?? 0) + 1,
            )
          }
    }
  />,
)
