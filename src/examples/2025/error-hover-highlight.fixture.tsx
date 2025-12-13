import React from "react"
import { PCBViewer } from "../../PCBViewer"
import type { PcbTraceError } from "circuit-json"

export const ErrorHoverHighlight: React.FC = () => {
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "generic_0",
      name: "R1",
      supplier_part_numbers: {},
    },
    {
      type: "pcb_component",
      source_component_id: "generic_0",
      pcb_component_id: "pcb_generic_component_0",
      layer: "top",
      center: { x: 0, y: 0 },
      rotation: 0,
      width: 0,
      height: 0,
    },
    {
      type: "pcb_smtpad",
      layer: "top",
      pcb_component_id: "pcb_generic_component_0",
      pcb_smtpad_id: "pcb_smtpad_0",
      shape: "rect",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
    {
      type: "pcb_smtpad",
      layer: "top",
      pcb_component_id: "pcb_generic_component_0",
      pcb_smtpad_id: "pcb_smtpad_1",
      shape: "rect",
      x: 4,
      y: 4,
      width: 1,
      height: 1,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_0",
      source_port_id: "source_port_0",
      x: 0,
      y: 0,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      source_port_id: "source_port_1",
      x: 4,
      y: 4,
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_0",
      route: [
        { x: 0, y: 0, start_pcb_port_id: "pcb_port_0" },
        { x: 4, y: 4, end_pcb_port_id: "pcb_port_1" },
      ],
    },
    {
      type: "pcb_trace_error",
      pcb_trace_error_id: "error_1",
      message:
        "DRC violation: Trace width too narrow for high-frequency signals",
      error_type: "pcb_trace_error",
      center: { x: 2, y: 2 },
      pcb_port_ids: ["pcb_port_0", "pcb_port_1"],
      pcb_trace_id: "pcb_trace_0",
      pcb_component_ids: ["pcb_generic_component_0"],
      source_trace_id: "source_trace_0",
    } as PcbTraceError,
    {
      type: "pcb_trace_error",
      pcb_trace_error_id: "error_2",
      message:
        "Via collision detected at component boundary - this is a longer error message to test text wrapping and positioning",
      error_type: "pcb_trace_error",
      center: { x: 0.5, y: 0.5 },
      pcb_port_ids: ["pcb_port_0"],
      pcb_trace_id: "pcb_trace_0",
      pcb_component_ids: ["pcb_generic_component_0"],
      source_trace_id: "source_trace_0",
    } as PcbTraceError,
  ]

  return (
    <div style={{ backgroundColor: "black", padding: "20px" }}>
      <div
        style={{
          color: "white",
          marginBottom: "10px",
          fontFamily: "sans-serif",
        }}
      >
        <h3>Error Hover Highlighting Test</h3>
        <p>Test both error hover behaviors:</p>
        <ul>
          <li>
            <strong>Hover over error elements on PCB:</strong> Shows error popup
            (original behavior)
          </li>
          <li>
            <strong>Hover over errors in toolbar:</strong> Highlights error on
            PCB with enhanced styling
          </li>
        </ul>
        <p>The popup positioning adapts to prevent going off-screen.</p>
      </div>
      <PCBViewer
        circuitJson={circuitJson as any}
        height={400}
        initialState={{
          is_showing_drc_errors: false,
        }}
      />
    </div>
  )
}

export default ErrorHoverHighlight
