import { InteractiveGraphics } from "./InteractiveGraphics"
import type { AnyCircuitElement } from "circuit-json"
import type { EditEvent } from "./edit-events"
import { useEffect, useRef, useState } from "react"

export interface PCBViewerProps {
  children?: any
  soup?: AnyCircuitElement[]
  circuitJson?: AnyCircuitElement[]
  onEditEventsChanged?: (editEvents: EditEvent[]) => void
  editEvents?: EditEvent[]
  /** @deprecated Use focusOnHover={false} instead */
  disableAutoFocus?: boolean
  /** When true (default), the viewer will auto-focus when hovered. Set to false to disable. */
  focusOnHover?: boolean
  allowEditing?: boolean
}

export const PCBViewer = ({
  children,
  soup,
  circuitJson,
  onEditEventsChanged,
  editEvents,
  disableAutoFocus,
  focusOnHover = true,
  allowEditing = true,
}: PCBViewerProps) => {
  // Support deprecated disableAutoFocus: if it's true, treat focusOnHover as false
  const resolvedFocusOnHover =
    disableAutoFocus !== undefined ? !disableAutoFocus : focusOnHover

  const elements = circuitJson ?? soup ?? []

  return (
    <InteractiveGraphics
      circuitJson={elements}
      onEditEventsChanged={onEditEventsChanged}
      editEvents={editEvents}
      focusOnHover={resolvedFocusOnHover}
      allowEditing={allowEditing}
    />
  )
}
