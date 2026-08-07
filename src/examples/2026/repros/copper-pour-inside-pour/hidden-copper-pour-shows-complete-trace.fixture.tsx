import React from "react"
import { PCBViewer } from "../../../../PCBViewer"
import circuitJson from "./copper-pour-same-net-trace-fully-covered.json"

export const HiddenCopperPourShowsCompleteTrace: React.FC = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={circuitJson as any}
        initialState={{ is_showing_copper_pours: false }}
      />
    </div>
  )
}

export default HiddenCopperPourShowsCompleteTrace
