import { useRef, useState, useCallback } from "react"
import { PCBViewerWithoutInteraction } from "./PCBViewerWithoutInteraction"
import type { AnyCircuitElement } from "circuit-json"

export interface InteractiveGraphicsProps {
  circuitJson: AnyCircuitElement[]
  height?: number | string
  width?: number | string
  focusOnHover?: boolean
  allowEditing?: boolean
  editEvents?: any[]
  onEditEventsChanged?: (editEvents: any[]) => void
}

export const InteractiveGraphics = ({
  circuitJson,
  height = 600,
  width = "100%",
  focusOnHover = true,
  allowEditing,
  editEvents,
  onEditEventsChanged,
}: InteractiveGraphicsProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  const handleMouseEnter = useCallback(() => {
    if (focusOnHover && containerRef.current) {
      containerRef.current.focus()
      setIsFocused(true)
    }
  }, [focusOnHover])

  const handleMouseLeave = useCallback(() => {
    if (focusOnHover) {
      setIsFocused(false)
    }
  }, [focusOnHover])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
  }, [])

  return (
    <div
      ref={containerRef}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: PCB viewer requires keyboard focus for zoom/pan
      tabIndex={0}
      style={{ width, outline: isFocused ? undefined : "none" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <PCBViewerWithoutInteraction
        circuitJson={circuitJson}
        height={height}
        width={width}
        allowEditing={allowEditing}
        editEvents={editEvents}
        onEditEventsChanged={onEditEventsChanged}
      />
    </div>
  )
}

export default InteractiveGraphics
