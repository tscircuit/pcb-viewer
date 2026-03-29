import { Circuit } from "@tscircuit/core"
import type React from "react"
import { InteractiveGraphics } from "./InteractiveGraphics"
import type { AnyCircuitElement } from "circuit-json"

export interface PCBViewerProps {
  children?: React.ReactNode
  soup?: AnyCircuitElement[]
  circuitJson?: AnyCircuitElement[]
  circuit?: Circuit
  height?: number | string
  width?: number | string
  /**
   * When true (default), the viewer will auto-focus on hover.
   * @default true
   */
  focusOnHover?: boolean
  /**
   * @deprecated Use `focusOnHover={false}` instead.
   */
  disableAutoFocus?: boolean
  allowEditing?: boolean
  editingEnabled?: boolean
  onEditEventsChanged?: (editEvents: any[]) => void
}

export const PCBViewer = ({
  soup,
  circuitJson,
  circuit,
  height = 600,
  width = "100%",
  focusOnHover = true,
  disableAutoFocus,
  allowEditing,
  editingEnabled,
  onEditEventsChanged,
  children,
}: PCBViewerProps) => {
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
      allowEditing={allowEditing ?? editingEnabled ?? false}
      onEditEventsChanged={onEditEventsChanged}
    >
      {children}
    </InteractiveGraphics>
  )
}

export default PCBViewer
