import React from "react"
import { PCBViewer } from "../../../PCBViewer"
import circuitJson from "./overlapping-inner-layer-copper-pours.json"

const OverlappingInnerLayerCopperPours: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black", padding: "20px" }}>
      <div style={{ marginBottom: "20px", color: "white" }}>
        <h3>Overlapping Inner Layer Copper Pours</h3>
        <p>
          This fixture uses the exact PCB slice extracted from the reported
          circuit JSON, including the board, components, pads, traces, vias,
          errors, and both overlapping inner-layer pours.
        </p>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          How to verify: switch between `inner1` and `inner2`. The selected
          layer should render fully opaque on top while the other inner pour
          fades beneath it.
        </p>
      </div>
      <PCBViewer circuitJson={circuitJson as any} />
    </div>
  )
}

export default OverlappingInnerLayerCopperPours
