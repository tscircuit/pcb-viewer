import { type Matrix, applyToPoint, identity } from "transformation-matrix"
import type { AnyCircuitElement } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import { useGlobalStore } from "../global-store"
import { zIndexMap } from "lib/util/z-index-map"
import { useMemo } from "react"
import { findBoundsAndCenter } from "@tscircuit/soup-util"

interface Props {
  transform?: Matrix
  soup?: AnyCircuitElement[]
  children: any
}

const colors = [
  "#a6cee3",
  "#1f78b4",
  "#b2df8a",
  "#33a02c",
  "#fb9a99",
  "#e31a1c",
  "#fdbf6f",
  "#ff7f00",
  "#cab2d6",
  "#6a3d9a",
  "#ffff99",
  "#b15928",
]

export const PcbGroupOverlay = ({ transform, soup, children }: Props) => {
  const isShowingPcbGroups = useGlobalStore((s) => s.is_showing_pcb_groups)

  const pcbGroups = useMemo(() => {
    if (!soup || !isShowingPcbGroups) return []
    // TODO assume pcb_group type
    return (soup as any).filter((e: any) => e.type === "pcb_group")
  }, [soup, isShowingPcbGroups])

  const groupBounds = useMemo(() => {
    if (pcbGroups.length === 0) return []

    return pcbGroups.map((group) => {
      const componentsInGroup = group.pcb_component_ids.map((id) =>
        su(soup).pcb_component.get(id),
      )
      const smtPadsInGroup = componentsInGroup.flatMap((c) =>
        su(soup).pcb_smtpad.list({ pcb_component_id: c.pcb_component_id }),
      )
      const holeInGroup = componentsInGroup.flatMap((c) =>
        su(soup).pcb_hole.list({ pcb_component_id: c.pcb_component_id }),
      )

      const allElms = [...smtPadsInGroup, ...holeInGroup]

      if (allElms.length === 0) return null

      const bounds = findBoundsAndCenter(allElms as any)
      return { ...bounds, name: group.name }
    })
  }, [pcbGroups, soup])

  if (!soup || !isShowingPcbGroups || pcbGroups.length === 0) return children
  if (!transform) transform = identity()

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
        {groupBounds.map((bounds, i) => {
          if (!bounds) return null
          const color = colors[i % colors.length]

          const { x, y } = applyToPoint(transform, {
            x: bounds.center.x - bounds.width / 2,
            y: bounds.center.y + bounds.height / 2,
          })
          const { x: x2, y: y2 } = applyToPoint(transform, {
            x: bounds.center.x + bounds.width / 2,
            y: bounds.center.y - bounds.height / 2,
          })

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={x2 - x}
                height={y2 - y}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeDasharray="4,4"
              />
              <text
                x={x + 4}
                y={y + 12}
                fill={color}
                fontSize="12px"
                style={{
                  transform: `scale(1, -1) translate(0, -${y * 2 + 12})`,
                }}
              >
                {bounds.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
