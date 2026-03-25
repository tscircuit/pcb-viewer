import React from "react"
import { PCBViewer } from "../PCBViewer"
import circuitJson from "../examples/2026/repros/arduino-uno/arduino-uno.circuit.json"

export default function ArduinoUnoPage() {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={circuitJson as any}
        initialState={{
          is_showing_drc_errors: true,
        }}
      />
    </div>
  )
}
