import type { ReactNode } from "react"
import { useRef } from "react"

export interface InteractiveGraphicsProps {
  focusOnHover?: boolean
  children: ReactNode
}

export const InteractiveGraphics = ({
  focusOnHover = true,
  children,
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
      onMouseEnter={handleMouseEnter}
      // tabIndex makes the div focusable; -1 keeps it out of tab order but
      // still programmatically focusable, satisfying a11y requirements.
      tabIndex={-1}
      style={{ outline: "none" }}
    >
      {children}
    </div>
  )
}
