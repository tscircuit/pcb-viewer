import React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenLine: React.FC = () => {
  return (
    <PCBViewer
      circuitJson={
        [
          {
            type: "pcb_silkscreen_line",
            layer: "top",
            pcb_silkscreen_line_id: "pcb_silkscreen_line_0",
            x1: -1.5,
            y1: 0,
            x2: 1.5,
            y2: 0,
            stroke_width: 0.1,
          },
        ] as any
      }
    />
  )
}

export default SilkscreenLine
