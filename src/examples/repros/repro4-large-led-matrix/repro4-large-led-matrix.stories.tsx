import React from "react"
import { PCBViewer } from "../../../PCBViewer"
import circuitJson from "./large-led-matrix.circuit.json"

export const Repro4LargeLedMatrix: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default Repro4LargeLedMatrix

