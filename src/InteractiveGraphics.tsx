import { useEffect, useRef, useState } from "react"
import { SuperGrid } from "react-supergrid"
import type { AnyCircuitElement } from "circuit-json"
import type { EditEvent } from "./edit-events"
import { PCBRender } from "./PCBRender"
import { useMouseMatrixTransform } from "use-mouse-matrix-transform"

export interface InteractiveGraphicsProps {
  circuitJson: AnyCircuitElement[]
  onEditEventsChanged?: (editEvents: EditEvent[]) => void
  editEvents?: EditEvent[]
  /** When true (default), the viewer will auto-focus when hovered. */
  focusOnHover?: boolean
  allowEditing?: boolean
}

export const InteractiveGraphics = ({
  circuitJson,
  onEditEventsChanged,
  editEvents,
  focusOnHover = true,
  allowEditing = true,
}: InteractiveGraphicsProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (focusOnHover && containerRef.current) {
      containerRef.current.focus()
    }
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      style={{ outline: "none" }}
    >
      <PCBRender
        circuitJson={circuitJson}
        onEditEventsChanged={onEditEventsChanged}
        editEvents={editEvents}
        allowEditing={allowEditing}
      />
    </div>
  )
}
