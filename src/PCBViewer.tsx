import { CircuitJsonPreview } from "@tscircuit/runframe"
import type { AnyCircuitElement } from "circuit-json"
import { InteractiveGraphics } from "./InteractiveGraphics"

export interface PCBViewerProps {
  soup?: AnyCircuitElement[]
  circuitJson?: AnyCircuitElement[]
  focusOnHover?: boolean
  /** @deprecated Use `focusOnHover` instead */
  disableAutoFocus?: boolean
  height?: number | string
  width?: number | string
}

export const PCBViewer = ({
  soup,
  circuitJson,
  focusOnHover = true,
  disableAutoFocus,
  height = 600,
  width = "100%",
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
    <InteractiveGraphics focusOnHover={resolvedFocusOnHover}>
      <CircuitJsonPreview
        circuitJson={elements}
        defaultActiveLayer="pcb"
        style={{ height, width }}
      />
    </InteractiveGraphics>
  )
}
