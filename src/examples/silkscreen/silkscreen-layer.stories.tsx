import React from "react"
import { PCBViewer } from "../../PCBViewer"

export const Silkscreenlayers: React.FC = () => {
  return (
    <PCBViewer
      circuitJson={
        [
          {
            type: "pcb_silkscreen_path",
            layer: "top",
            pcb_silkscreen_path_id: "pcb_silkscreen_path_0",
            route: [
              { x: -2, y: 0 },
              { x: -1, y: 0 },
              { x: 0, y: 1 },
              { x: 1, y: 0 },
              { x: 2, y: 0 },
            ],
            stroke_width: 0.1,
          },
          {
            type: "pcb_silkscreen_path",
            layer: "bottom",
            pcb_silkscreen_path_id: "pcb_silkscreen_path_1",
            route: [
              { x: -2, y: -0.5 },
              { x: -1, y: -0.5 },
              { x: 0, y: 0.5 },
              { x: 1, y: -0.5 },
              { x: 2, y: -0.5 },
            ],
            stroke_width: 0.1,
          },
        ] as any
      }
    />
  )
}

export default Silkscreenlayers
