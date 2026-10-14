import { createRoot } from "react-dom/client"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../src/index"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 20,
    height: 12,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "polarity",
    pcb_component_id: "component",
    layer: "top",
    text: "+ A   K -",
    font: "tscircuit2024",
    anchor_position: { x: 0, y: 1 },
    anchor_alignment: "center",
    font_size: 1,
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "cathode",
    pcb_component_id: "component",
    layer: "top",
    stroke_width: 0.15,
    route: [
      { x: -2, y: -2 },
      { x: 1, y: -3 },
      { x: -2, y: -4 },
      { x: -2, y: -2 },
    ],
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "bar",
    pcb_component_id: "component",
    layer: "top",
    stroke_width: 0.15,
    route: [
      { x: 1, y: -2 },
      { x: 1, y: -4 },
    ],
  },
]
createRoot(document.getElementById("root")!).render(
  <PCBViewer circuitJson={circuitJson} renderer="canvas" height={400} />,
)
