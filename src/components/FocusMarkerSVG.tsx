import React from "react"
import { zIndexMap } from "lib/util/z-index-map"

export const FocusMarkerSVG = ({
  center,
}: {
  center: { x: number; y: number }
}) => (
  <svg
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      pointerEvents: "none",
      mixBlendMode: "difference",
      zIndex: zIndexMap.errorOverlay + 30,
    }}
    width="100%"
    height="100%"
  >
    <circle
      cx={center.x}
      cy={center.y}
      r={11}
      fill="none"
      stroke="#ff6b6b"
      strokeWidth={2.5}
      opacity={0.95}
    />
    <circle cx={center.x} cy={center.y} r={4.5} fill="#ff6b6b" opacity={0.95} />
    <line
      x1={center.x - 18}
      y1={center.y}
      x2={center.x - 8}
      y2={center.y}
      stroke="#ff6b6b"
      strokeWidth={2}
    />
    <line
      x1={center.x + 8}
      y1={center.y}
      x2={center.x + 18}
      y2={center.y}
      stroke="#ff6b6b"
      strokeWidth={2}
    />
    <line
      x1={center.x}
      y1={center.y - 18}
      x2={center.x}
      y2={center.y - 8}
      stroke="#ff6b6b"
      strokeWidth={2}
    />
    <line
      x1={center.x}
      y1={center.y + 8}
      x2={center.x}
      y2={center.y + 18}
      stroke="#ff6b6b"
      strokeWidth={2}
    />
  </svg>
)
