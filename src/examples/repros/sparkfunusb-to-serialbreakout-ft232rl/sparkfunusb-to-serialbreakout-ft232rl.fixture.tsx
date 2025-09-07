import React, { useMemo } from "react"
import { PCBViewer } from "../../../PCBViewer"
import circuitJson from "./circuit.json"

export const Circuit: React.FC = () => {
  const height = useMemo(() => {
    return window.outerHeight ?? 600
  }, [])
  return (
    <div>
      <PCBViewer
        circuitJson={circuitJson as any}
        height={height}
        initialState={{
          is_showing_drc_errors: true,
        }}
      />
    </div>
  )
}

export default Circuit
