import type React from "react"
import { useCallback, useRef, useState } from "react"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewerWithoutContainerSize } from "./PCBViewerWithoutContainerSize"

export interface InteractiveGraphicsProps {
  circuitJson: AnyCircuitElement[]
  height?: number | string
  width?: number | string
  focusOnHover?: boolean
  allowEditing?: boolean
  onEditEventsChanged?: (editEvents: any[]) => void
  children?: React.ReactNode
}

export const InteractiveGraphics = ({
  circuitJson,
  height = 600,
  width = "100%",
  focusOnHover = true,
  allowEditing = false,
  onEditEventsChanged,
  children,
}: InteractiveGraphicsProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = useCallback(() => {
    if (focusOnHover) {
      setIsHovered(true)
    }
  }, [focusOnHover])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width, height, position: "relative" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <PCBViewerWithoutContainerSize
        circuitJson={circuitJson}
        height={height}
        width={width}
        focusOnHover={focusOnHover}
        isHovered={isHovered}
        allowEditing={allowEditing}
        onEditEventsChanged={onEditEventsChanged}
      />
      {children}
    </div>
  )
}

export default InteractiveGraphics
