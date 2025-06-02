import React from "react"
import { PCBViewer } from "../../../PCBViewer"
import soup from "./soup.json"

export const PortHintsNotShowing: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default PortHintsNotShowing
