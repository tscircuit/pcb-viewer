import type React from "react"
import { type Matrix, applyToPoint, identity } from "transformation-matrix"
import type { AnyCircuitElement, PcbPort } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import { useGlobalStore } from "global-store"
import { zIndexMap } from "lib/util/z-index-map"

interface Props {
  transform?: Matrix
  soup?: AnyCircuitElement[]
  children: any
}
type Point = { x: number; y: number }
export const RatsNestOverlay = ({ transform, soup, children }: Props) => {
  const isShowingRatsNest = useGlobalStore((s) => s.is_showing_rats_nest)
  if (!soup || !isShowingRatsNest) return children
  if (!transform) transform = identity()
  const sourceTraces = su(soup).source_trace.list()

  const groups: PcbPort[][] = []

  sourceTraces.forEach((sourceTrace) => {
    if (sourceTrace.connected_source_port_ids) {
      const group: PcbPort[] = []
      sourceTrace.connected_source_port_ids.forEach(
        (source_port_id: string) => {
          const pcbPort = su(soup).pcb_port.getWhere({ source_port_id })
          if (pcbPort) group.push(pcbPort)
        },
      )
      groups.push(group)
    }
  })

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
          opacity: 0.5,
          zIndex: zIndexMap.ratsNestOverlay,
        }}
      >
        {groups.map((group, index) => {
          // Connect all ports in group with a line, so...
          // 2 ports = 1 line
          // 3 ports = 3 lines
          // 4 ports = 6 lines

          const points: Array<Point> = group.map((port) =>
            applyToPoint(transform, { x: port.x, y: port.y }),
          )

          const lines: Array<[Point, Point]> = []
          for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
              lines.push([points[i], points[j]])
            }
          }

          return lines.map(([start, end], index) => {
            return (
              <line
                key={index}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="white"
                strokeWidth="1"
              />
            )
          })
        })}
      </svg>
    </div>
  )
}
