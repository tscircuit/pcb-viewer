import React, { useEffect, useRef } from "react"
import { PCBViewer } from "../PCBViewer"

export default () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor name="R1" />
      </PCBViewer>
    </div>
  )
}
