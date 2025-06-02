import { type Matrix, applyToPoint, identity } from "transformation-matrix"
import type { AnyCircuitElement } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import { useGlobalStore } from "../global-store"
import { zIndexMap } from "lib/util/z-index-map"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { useMemo } from "react"

interface Props {
  transform?: Matrix
  soup?: AnyCircuitElement[]
  children: any
}

type Point = { x: number; y: number }
type RatsNestLine = {
  key: string
  startPoint: Point
  endPoint: Point
  isInNet: boolean
}

export const RatsNestOverlay = ({ transform, soup, children }: Props) => {
  const isShowingRatsNest = useGlobalStore((s) => s.is_showing_rats_nest)

  const { netMap, idToNetMap } = useMemo(
    () => getFullConnectivityMapFromCircuitJson(soup || []),
    [soup],
  )

  const ratsNestLines = useMemo(() => {
    if (!soup || !isShowingRatsNest) return []

    const getElementPosition = (id: string): Point | null => {
      // @ts-ignore
      const element = su(soup)[id.replace(/_\d+$/, "")].get(id)
      if (element && "x" in element && "y" in element) {
        return { x: element.x, y: element.y }
      }
      return null
    }

    const findNearestPointInNet = (
      sourcePoint: Point,
      netId: string,
    ): Point | null => {
      const connectedIds = netMap[netId] || []
      let nearestPoint: Point | null = null
      let minDistance = Infinity

      connectedIds.forEach((id) => {
        const pos = getElementPosition(id)
        if (pos) {
          const distance = Math.sqrt(
            (sourcePoint.x - pos.x) ** 2 + (sourcePoint.y - pos.y) ** 2,
          )
          if (distance < minDistance && distance > 0) {
            minDistance = distance
            nearestPoint = pos
          }
        }
      })

      return nearestPoint
    }

    const pcbPorts = su(soup).pcb_port.list()
    const sourceTraces = su(soup).source_trace.list()
    const lines: RatsNestLine[] = []

    pcbPorts.forEach((port, index) => {
      const netId = idToNetMap[port.pcb_port_id]

      let isInNet = false

      for (const trace of sourceTraces) {
        const sourceTrace = trace.connected_source_port_ids.includes(
          port.source_port_id,
        )
        if (sourceTrace && trace.connected_source_net_ids.length > 0) {
          isInNet = true
        }
      }

      if (!netId) return

      const startPoint = { x: port.x, y: port.y }
      const nearestPoint = findNearestPointInNet(startPoint, netId)

      if (!nearestPoint) return

      lines.push({
        key: `${port.pcb_port_id}-${index}`,
        startPoint,
        endPoint: nearestPoint,
        isInNet,
      })
    })

    return lines
  }, [soup, netMap, idToNetMap, isShowingRatsNest])

  if (!soup || !isShowingRatsNest) return children
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
          opacity: 0.5,
          zIndex: zIndexMap.ratsNestOverlay,
        }}
      >
        {ratsNestLines.map(({ key, startPoint, endPoint, isInNet }) => {
          const transformedStart = applyToPoint(transform, startPoint)
          const transformedEnd = applyToPoint(transform, endPoint)

          return (
            <line
              key={key}
              x1={transformedStart.x}
              y1={transformedStart.y}
              x2={transformedEnd.x}
              y2={transformedEnd.y}
              stroke="white"
              strokeWidth="1"
              strokeDasharray={isInNet ? "6,6" : undefined}
            />
          )
        })}
      </svg>
    </div>
  )
}
