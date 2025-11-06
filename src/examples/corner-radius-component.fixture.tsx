import { PCBViewer } from "../PCBViewer"

const CornerRadiusCircuitJson = [
  {
    type: "pcb_silkscreen_rect",
    layer: "top" as const,
    pcb_component_id: "pcb_comp_3",
    pcb_silkscreen_rect_id: "rect_3_unfilled_stroked",
    center: { x: 5, y: 5 },
    width: 2,
    height: 2,
    stroke_width: 0.2,
    is_filled: false,
    corner_radius: 0.5,
  },
  {
    type: "pcb_fabrication_note_rect",
    pcb_fabrication_note_rect_id: "pcb_fabrication_note_rect_0",
    pcb_component_id: null,
    center: { x: -5, y: -5 },
    width: 6,
    height: 4,
    stroke_width: 0.2,
    is_filled: true,
    is_stroke_dashed: true,
    layer: "top",
    corner_radius: 0.3,
  },
  {
    type: "pcb_silkscreen_rect",
    layer: "bottom" as const,
    pcb_component_id: "pcb_comp_7",
    pcb_silkscreen_rect_id: "rect_7_default_stroke_width_dashed",
    center: { x: 5, y: 8 },
    width: 2,
    height: 2,
    stroke_width: 0.1,
    is_filled: false,
    has_stroke: true,
    is_stroke_dashed: true,
    corner_radius: 0.25,
  },
]

export const CornerRadiusRect: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={CornerRadiusCircuitJson as any} />
    </div>
  )
}

export default {
  CornerRadiusRect,
}
