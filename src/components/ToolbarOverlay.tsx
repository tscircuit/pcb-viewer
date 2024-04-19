import { useState } from "react"
interface Props {
  children?: any
}

export const ToolbarOverlay = ({ children }: Props) => {
  const [isMouseOver, setIsMouseOver] = useState(false)

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => {
        setIsMouseOver(true)
      }}
      onMouseLeave={() => {
        setIsMouseOver(false)
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          opacity: isMouseOver ? 1 : 0,
          top: 0,
          left: 0,
          transition: isMouseOver
            ? "opacity 100ms linear"
            : "opacity 1s linear",
          zIndex: 100,
          color: "red",
          fontSize: 12,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "#1F1F1F",
            border: "1px solid #666",
            margin: 16,
            padding: 4,
            borderRadius: 2,
            color: "#eee",
            cursor: "pointer",
          }}
        >
          layer: top
        </div>
      </div>
    </div>
  )
}
