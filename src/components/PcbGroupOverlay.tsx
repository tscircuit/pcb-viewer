import { useGlobalStore } from "../global-store"
import type { AnyCircuitElement, PcbGroup } from "circuit-json"
import { applyToPoint, type Matrix, identity } from "transformation-matrix"
import { zIndexMap } from "lib/util/z-index-map"

interface Props {
  transform?: Matrix
  elements?: AnyCircuitElement[]
  children: any
}

export const PcbGroupOverlay = ({ transform, elements, children }: Props) => {
  const isShowingPcbGroups = useGlobalStore((s) => s.is_showing_pcb_groups)

  if (!transform) transform = identity()
  if (!isShowingPcbGroups || !elements) return <>{children}</>

  const groups = elements.filter((e): e is PcbGroup => e.type === "pcb_group")

  return (
    <div style={{ position: "relative" }}>
      {children}
      <svg
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: zIndexMap.pcbGroupOverlay,
        }}
      >
        {groups.map((group, i) => {
          const halfWidth = group.width / 2
          const halfHeight = group.height / 2
          const corners = [
            { x: group.center.x - halfWidth, y: group.center.y - halfHeight },
            { x: group.center.x + halfWidth, y: group.center.y - halfHeight },
            { x: group.center.x + halfWidth, y: group.center.y + halfHeight },
            { x: group.center.x - halfWidth, y: group.center.y + halfHeight },
          ].map((pt) => applyToPoint(transform!, pt))

          const color = `hsl(${(i * 60) % 360}, 100%, 50%)`
          const polygonPoints = corners.map((pt) => `${pt.x},${pt.y}`).join(" ")
          const labelPos = corners[0]

          return (
            <g key={group.pcb_group_id}>
              <polygon
                points={polygonPoints}
                fill="none"
                stroke={color}
                strokeWidth={1}
              />
              <text x={labelPos.x} y={labelPos.y - 4} fill={color} fontSize={8}>
                {group.name ?? group.pcb_group_id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
