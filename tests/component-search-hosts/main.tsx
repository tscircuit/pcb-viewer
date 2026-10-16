import "./preflight.css"
import type { AnyCircuitElement } from "circuit-json"
import { PcbViewerWithContainerHeight } from "host-pcb-wrapper"
import { createRoot } from "react-dom/client"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 40,
    height: 30,
    num_layers: 2,
    thickness: 1.6,
  },
  {
    type: "source_component",
    source_component_id: "source",
    name: "U1",
    ftype: "simple_chip",
  },
  {
    type: "pcb_component",
    pcb_component_id: "component",
    source_component_id: "source",
    center: { x: 8, y: 5 },
    width: 4,
    height: 3,
    rotation: 0,
    layer: "bottom",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad",
    pcb_component_id: "component",
    x: 8,
    y: 5,
    width: 1,
    height: 1,
    shape: "rect",
    layer: "bottom",
  },
] as AnyCircuitElement[]

createRoot(document.getElementById("root")!).render(
  <div style={{ height: 620, width: "100%", overflow: "hidden" }}>
    <PcbViewerWithContainerHeight
      renderer="canvas"
      focusOnHover={false}
      clickToInteractEnabled={new URLSearchParams(location.search).has(
        "clickToInteract",
      )}
      circuitJson={circuitJson}
    />
  </div>,
)
