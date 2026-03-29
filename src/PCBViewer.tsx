import { InteractiveGraphics } from "./InteractiveGraphics"
import type { AnyCircuitElement } from "circuit-json"

export interface PCBViewerProps {
  soup?: AnyCircuitElement[]
  circuitJson?: AnyCircuitElement[]
  height?: number | string
  width?: number | string
  /**
   * @deprecated Use `focusOnHover` instead.
   */
  disableAutoFocus?: boolean
  focusOnHover?: boolean
  allowEditing?: boolean
  editEvents?: any[]
  onEditEventsChanged?: (editEvents: any[]) => void
}

export const PCBViewer = ({
  soup,
  circuitJson,
  height = 600,
  width = "100%",
  disableAutoFocus,
  focusOnHover = true,
  allowEditing,
  editEvents,
  onEditEventsChanged,
}: PCBViewerProps) => {
  // Resolve focusOnHover: explicit focusOnHover prop takes precedence over
  // deprecated disableAutoFocus. Only fall back to disableAutoFocus when
  // focusOnHover has not been explicitly provided (i.e. still at default true).
  const resolvedFocusOnHover = (() => {
    if (disableAutoFocus !== undefined && focusOnHover !== true) {
      console.warn(
        "Both disableAutoFocus and focusOnHover are set. Using focusOnHover. disableAutoFocus is deprecated.",
      )
      return focusOnHover
    }
    return disableAutoFocus !== undefined ? !disableAutoFocus : focusOnHover
  })()

  const elements = circuitJson ?? soup ?? []

  return (
    <InteractiveGraphics
      circuitJson={elements}
      height={height}
      width={width}
      focusOnHover={resolvedFocusOnHover}
      allowEditing={allowEditing}
      editEvents={editEvents}
      onEditEventsChanged={onEditEventsChanged}
    />
  )
}

export default PCBViewer
