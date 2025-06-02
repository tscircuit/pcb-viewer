import React from "react"
import { PCBViewer } from "../../../PCBViewer"
import soup from "./nulltracehint-soup.json"

export const NullTraceHint: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default NullTraceHint

