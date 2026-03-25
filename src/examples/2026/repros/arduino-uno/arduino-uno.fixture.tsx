import React from "react"
import { PCBViewer } from "../../../../PCBViewer"
import circuitJson from "./arduino-uno.circuit.json"

export const ArduinoUno: React.FC = () => {
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

export default ArduinoUno
