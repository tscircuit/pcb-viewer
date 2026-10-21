import { createRoot } from "react-dom/client"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../src/index"

const layer =
  new URLSearchParams(location.search).get("layer") === "bottom"
    ? "bottom"
    : "top"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    pcb_component_id: "component",
    shape: "rect",
    layer,
    x: -3,
    y: 0,
    width: 1,
    height: 2,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad2",
    pcb_component_id: "component",
    shape: "rect",
    layer,
    x: 3,
    y: 0,
    width: 1,
    height: 2,
  },
  {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "dimension",
    pcb_component_id: "component",
    layer,
    from: { x: -3, y: 3 },
    to: { x: 3, y: 3 },
    text: "6 mm",
    font: "tscircuit2024",
    font_size: 0.4,
    arrow_size: 0.3,
  },
  {
    type: "pcb_fabrication_note_rect",
    pcb_fabrication_note_rect_id: "body",
    pcb_component_id: "component",
    layer,
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    stroke_width: 0.12,
  },
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
    layer,
    text: "FAB +",
    font: "tscircuit2024",
    anchor_position: { x: 0, y: 1 },
    anchor_alignment: "center",
    font_size: 1,
  },
  {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "cathode",
    pcb_component_id: "component",
    layer,
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
    layer,
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
