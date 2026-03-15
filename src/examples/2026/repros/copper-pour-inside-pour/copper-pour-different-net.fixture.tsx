import React from "react"
import { PCBViewer } from "../../../../PCBViewer"
import circuitJson from "./copper-pour-different-net.json"

export const CopperPourDifferentNet: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default CopperPourDifferentNet
