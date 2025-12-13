import type React from "react"
import { PCBViewer } from "../../PCBViewer"

const silkscreenCircuitJson = [
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
  },
  {
    type: "pcb_silkscreen_rect",
    layer: "top",
    pcb_component_id: "pcb_comp_4",
    pcb_silkscreen_rect_id: "rect_4_filled_nostroke",
    center: { x: 8, y: 5 },
    width: 2,
    height: 2,
    stroke_width: 0.1,
    is_filled: true,
    has_stroke: false,
  },
  {
    type: "pcb_silkscreen_rect",
    layer: "bottom" as const,
    pcb_component_id: "pcb_comp_5",
    pcb_silkscreen_rect_id: "rect_5_filled_dashedstroke",
    center: { x: 11, y: 5 },
    width: 2,
    height: 2,
    stroke_width: 0.15,
    is_filled: true,
    has_stroke: true,
    is_stroke_dashed: true,
  },
  {
    type: "pcb_silkscreen_rect",
    layer: "top" as const,
    pcb_component_id: "pcb_comp_6",
    pcb_silkscreen_rect_id: "rect_6_invisible",
    center: { x: 14, y: 5 },
    width: 2,
    stroke_width: 0.1,
    height: 2,
    is_filled: false,
    has_stroke: false,
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
  },
]

export const SilkscreenRect: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={silkscreenCircuitJson as any} />
    </div>
  )
}

export default {
  SilkscreenRect,
}
