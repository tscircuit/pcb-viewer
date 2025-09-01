import React from "react"
import { PCBViewer } from "../PCBViewer"                 // ✅ correct path
import type { AnyCircuitElement } from "circuit-json"
import type { ManualEditEvent } from "@tscircuit/props"

const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    width: 20,
    height: 12,
    center: { x: 0, y: 0 },                              // keep if allowed
  } as AnyCircuitElement,                                 // cast to relax literal checks
]

export default function ManualEditBoardFixture() {
  return (
    <div style={{ width: 900, height: 600 }}>
      <PCBViewer
        circuitJson={circuit}
        height={600}
        allowEditing
        initialState={{ in_edit_board_mode: true }}
        onEditEventsChanged={(evts: ManualEditEvent[]) => {
          console.log("[fixture] editEvents:", evts)
        }}
      />
    </div>
  )
}
