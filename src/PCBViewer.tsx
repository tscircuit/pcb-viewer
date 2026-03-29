import { useState, useEffect, useRef } from "react"
import { CanvasElementsRenderer } from "./components/CanvasElementsRenderer"
import { EditTraceOverlay } from "./components/EditTraceOverlay"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { ToolBar } from "./components/ToolBar"
import {
  useMouseMatrixTransform,
  useRenderedCircuit,
  useWindowKeyDown,
} from "./hooks"
import type { AnyCircuitElement } from "circuit-json"
import { useGlobalStore } from "./hooks/use-global-store"
import type { EditEvent } from "./edit-events"

export interface PCBViewerProps {
  soup?: AnyCircuitElement[]
  circuitJson?: AnyCircuitElement[]
  height?: number | string
  /**
   * If false, the viewer will not automatically focus (capture keyboard/scroll
   * events) when the mouse hovers over it.
   * @default true
   */
  focusOnHover?: boolean
  /**
   * @deprecated Use `focusOnHover={false}` instead.
   */
  disableAutoFocus?: boolean
  onEditEventsChanged?: (editEvents: EditEvent[]) => void
  editTraceEnabled?: boolean
  allowEditing?: boolean
}

export const PCBViewer = ({
  soup,
  circuitJson,
  height = 600,
  focusOnHover,
  disableAutoFocus,
  onEditEventsChanged,
  editTraceEnabled,
  allowEditing = true,
}: PCBViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const globalStore = useGlobalStore()

  // Resolve effective focusOnHover value:
  // - If focusOnHover is explicitly provided, use it.
  // - Else if (deprecated) disableAutoFocus is provided, invert it.
  // - Otherwise default to true.
  const effectiveFocusOnHover =
    focusOnHover !== undefined
      ? focusOnHover
      : disableAutoFocus !== undefined
        ? !disableAutoFocus
        : true

  const elements = circuitJson ?? soup ?? []

  const { transform, onMouseDown, onMouseMove, onMouseUp, onWheel } =
    useMouseMatrixTransform({
      containerRef,
      isFocused,
    })

  const { renderedCircuit } = useRenderedCircuit({ elements, transform })

  useWindowKeyDown({ isFocused })

  const handleMouseEnter = () => {
    if (effectiveFocusOnHover) {
      setIsFocused(true)
    }
  }

  const handleMouseLeave = () => {
    setIsFocused(false)
  }

  useEffect(() => {
    if (onEditEventsChanged) {
      onEditEventsChanged(globalStore.editEvents)
    }
  }, [globalStore.editEvents, onEditEventsChanged])

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
      style={{
        position: "relative",
        width: "100%",
        height,
        overflow: "hidden",
        cursor: "crosshair",
        userSelect: "none",
      }}
    >
      <ErrorBoundary>
        <ToolBar
          allowEditing={allowEditing}
          editTraceEnabled={editTraceEnabled ?? false}
        />
        <CanvasElementsRenderer
          elements={elements}
          transform={transform}
          renderedCircuit={renderedCircuit}
          height={height}
        />
        {editTraceEnabled && (
          <EditTraceOverlay transform={transform} containerRef={containerRef} />
        )}
      </ErrorBoundary>
    </div>
  )
}
