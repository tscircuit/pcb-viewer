import React from "react"
import { PCBViewer } from "../../PCBViewer"
import timer555 from "../../assets/timer-555"

export const LongLineErrorExample: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={timer555 as any} />
    </div>
  )
}

export default LongLineErrorExample
