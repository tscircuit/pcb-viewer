import React, { useState } from "react"
import { PCBViewer } from "../../../PCBViewer"
import type { AnyCircuitElement } from "circuit-json"

const sampleCircuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    width: 20,
    height: 20,
    center: { x: 0, y: 0 },
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    x: -5,
    y: 0,
    width: 1,
    height: 0.5,
    layer: "top",
    shape: "rect",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad2",
    x: 5,
    y: 0,
    width: 1,
    height: 0.5,
    layer: "top",
    shape: "rect",
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace1",
    route: [
      { x: -5, y: 0, via: false, layer: "top" },
      { x: 5, y: 0, via: false, layer: "top" },
    ],
  },
]

export const HotkeyWithTextareaExample: React.FC = () => {
  const [textValue, setTextValue] = useState("Testing")

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        flexDirection: "column",
        gap: "1rem",
        padding: "1rem",
      }}
    >
      <div style={{ display: "flex", gap: "1rem", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <label
            htmlFor="test-textarea"
            style={{
              marginBottom: "0.5rem",
              fontWeight: "bold",
              fontSize: "16px",
            }}
          >
            Textarea (try typing 'd' here):
          </label>
          <textarea
            id="test-textarea"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            style={{
              flex: 1,
              border: "2px solid #3b82f6",
              borderRadius: "4px",
              padding: "1rem",
              fontFamily: "monospace",
              fontSize: "14px",
              resize: "none",
            }}
          />
          <div style={{ marginTop: "0.5rem", fontSize: "12px", color: "#666" }}>
            Current value: {textValue}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <label
            style={{
              marginBottom: "0.5rem",
              fontWeight: "bold",
              fontSize: "16px",
            }}
          >
            PCB Viewer (hover and press 'd'):
          </label>
          <div
            style={{
              flex: 1,
              border: "2px solid #22c55e",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <PCBViewer circuitJson={sampleCircuit as any} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default HotkeyWithTextareaExample
