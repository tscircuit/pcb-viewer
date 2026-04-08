import React from "react"
import type { AnyCircuitElement, PcbTraceError } from "circuit-json"
import { PCBViewer } from "../../../PCBViewer"

const buildErrorsDropdownScrollCircuitJson = (): AnyCircuitElement[] => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 90,
      height: 70,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
  ]

  const columnCount = 5
  const rowCount = 8

  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < columnCount; col += 1) {
      const index = row * columnCount + col
      const startX = -30 + col * 14
      const startY = -24 + row * 7
      const endX = startX + 8
      const endY = startY + 3

      circuitJson.push(
        {
          type: "pcb_port",
          pcb_port_id: `pcb_port_start_${index}`,
          source_port_id: `source_port_start_${index}`,
          layers: ["top"],
          x: startX,
          y: startY,
        },
        {
          type: "pcb_port",
          pcb_port_id: `pcb_port_end_${index}`,
          source_port_id: `source_port_end_${index}`,
          layers: ["top"],
          x: endX,
          y: endY,
        },
        {
          type: "pcb_trace",
          pcb_trace_id: `pcb_trace_${index}`,
          route: [
            {
              x: startX,
              y: startY,
              route_type: "wire",
              layer: "top",
              width: 0.18,
              start_pcb_port_id: `pcb_port_start_${index}`,
            },
            {
              x: startX + 4,
              y: startY + 1.5,
              route_type: "wire",
              layer: "top",
              width: 0.18,
            },
            {
              x: endX,
              y: endY,
              route_type: "wire",
              layer: "top",
              width: 0.18,
              end_pcb_port_id: `pcb_port_end_${index}`,
            },
          ],
        },
        {
          type: "pcb_trace_error",
          pcb_trace_error_id: `pcb_trace_error_${index}`,
          pcb_trace_id: `pcb_trace_${index}`,
          source_trace_id: `source_trace_${index}`,
          pcb_port_ids: [`pcb_port_start_${index}`, `pcb_port_end_${index}`],
          pcb_component_ids: [],
          error_type: "pcb_trace_error",
          center: { x: (startX + endX) / 2, y: (startY + endY) / 2 },
          message: `Dense dropdown repro ${index + 1}: trace clearance violation between row ${
            row + 1
          } and column ${
            col + 1
          }, with an intentionally long message so the toolbar dropdown has enough content to force scrolling and wrapped detail expansion.`,
        } as PcbTraceError,
      )
    }
  }

  return circuitJson
}

export const ErrorsDropdownScrollRepro: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black", minHeight: "100vh" }}>
      <PCBViewer
        circuitJson={buildErrorsDropdownScrollCircuitJson()}
        height={560}
        initialState={{
          is_showing_drc_errors: true,
        }}
      />
    </div>
  )
}

export default ErrorsDropdownScrollRepro
