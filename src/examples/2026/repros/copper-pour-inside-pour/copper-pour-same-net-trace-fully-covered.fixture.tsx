import React from "react"
import { PCBViewer } from "../../../../PCBViewer"
import circuitJson from "./copper-pour-same-net-trace-fully-covered.json"

export const CopperPourSameNetTraceFullyCovered: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default CopperPourSameNetTraceFullyCovered
