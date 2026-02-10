import React, { useState } from "react"
import { PCBViewer } from "../../../PCBViewer"
import type { ManualEditEvent } from "@tscircuit/props"

export const SilkscreenLineWithComponentMove: React.FC = () => {
  const [editEvents, setEditEvents] = useState<ManualEditEvent[]>([])

  const circuitJson = [
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      center: { x: 0, y: 0 },
      width: 2,
      height: 1,
      layer: "top",
    },
    {
      type: "pcb_silkscreen_line",
      layer: "top",
      pcb_component_id: "comp_1",
      pcb_silkscreen_line_id: "line_1",
      x1: -1,
      y1: -0.5,
      x2: 1,
      y2: -0.5,
      stroke_width: 0.1,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_1",
      pcb_component_id: "comp_1",
      shape: "rect",
      x: -0.5,
      y: 0,
      width: 0.6,
      height: 0.8,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_2",
      pcb_component_id: "comp_1",
      shape: "rect",
      x: 0.5,
      y: 0,
      width: 0.6,
      height: 0.8,
      layer: "top",
    },
  ]

  return (
    <div style={{ backgroundColor: "black" }}>
      <div style={{ color: "white", padding: "10px" }}>
        <h3>Test: Silkscreen Line Movement with Component</h3>
        <p>
          Move the component by clicking and dragging. The silkscreen line
          should move with it.
        </p>
        <p>Current edit events: {editEvents.length}</p>
      </div>
      <PCBViewer
        circuitJson={circuitJson as any}
        allowEditing={true}
        editEvents={editEvents}
        onEditEventsChanged={(events) => {
          console.log("Edit events changed:", events)
          setEditEvents(events)
        }}
        initialState={{
          in_edit_mode: true,
          in_move_footprint_mode: true,
        }}
      />
    </div>
  )
}

export default SilkscreenLineWithComponentMove
