import { type Matrix, applyToPoint, identity } from "transformation-matrix"
import type { AnyCircuitElement } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { useGlobalStore } from "../global-store"
import { zIndexMap } from "lib/util/z-index-map"
import type { ConnectivityMap } from "circuit-json-to-connectivity-map"
import { useMemo } from "react"

interface Props {
  transform?: Matrix
  soup?: AnyCircuitElement[]
  connectivityMap: ConnectivityMap
  children: any
}

type Point = { x: number; y: number }
export type RatsNestLine = {
  key: string
  startPoint: Point
  endPoint: Point
  isInNet: boolean
}

const getElementId = (element: AnyCircuitElement): string | undefined => {
  const typedIdKey = `${element.type}_id`
  if (
    typedIdKey in element &&
    typeof (element as Record<string, unknown>)[typedIdKey] === "string"
  ) {
    return (element as Record<string, string>)[typedIdKey]
  }
  return undefined
}

const getElementPoint = (element: AnyCircuitElement): Point | null => {
  if (
    "x" in element &&
    "y" in element &&
    typeof element.x === "number" &&
    typeof element.y === "number" &&
    Number.isFinite(element.x) &&
    Number.isFinite(element.y)
  ) {
    return { x: element.x, y: element.y }
  }
  if (
    element.type === "pcb_smtpad" &&
    element.shape === "polygon" &&
    Array.isArray(element.points) &&
    element.points.length > 0
  ) {
    const validPoints = element.points.filter(
      (pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y),
    )
    if (validPoints.length > 0) {
      return {
        x: validPoints.reduce((sum, pt) => sum + pt.x, 0) / validPoints.length,
        y: validPoints.reduce((sum, pt) => sum + pt.y, 0) / validPoints.length,
      }
    }
  }
  return null
}

export const computeRatsNestLines = ({
  soup,
  netMap,
  idToNetMap,
}: {
  soup: AnyCircuitElement[]
  netMap: Record<string, string[]>
  idToNetMap: Record<string, string>
}): RatsNestLine[] => {
  const elementsById = new Map<string, AnyCircuitElement>()
  for (const element of soup) {
    const id = getElementId(element)
    if (id) {
      elementsById.set(id, element)
    }
  }

  const getElementPosition = (
    id: string,
    sourcePcbPortId: string,
  ): Point | null => {
    const element =
      elementsById.get(id) ??
      (
        su(soup) as Record<string, { get?: (key: string) => AnyCircuitElement }>
      )[id.replace(/_\d+$/, "")]?.get?.(id)
    if (!element) return null
    if ("pcb_port_id" in element && element.pcb_port_id === sourcePcbPortId) {
      return null
    }
    return getElementPoint(element)
  }

  const findNearestPointInNet = (
    sourcePoint: Point,
    sourcePcbPortId: string,
    netId: string,
  ): Point | null => {
    const connectedIds = netMap[netId] || []
    let nearestPoint: Point | null = null
    let minDistance = Infinity

    connectedIds.forEach((id) => {
      if (id === sourcePcbPortId) return
      const pos = getElementPosition(id, sourcePcbPortId)
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
    const netId =
      idToNetMap[port.pcb_port_id] ??
      (port.source_port_id ? idToNetMap[port.source_port_id] : undefined)

    let isInNet = false

    for (const trace of sourceTraces) {
      const sourceTrace = trace.connected_source_port_ids?.includes(
        port.source_port_id,
      )
      if (sourceTrace && (trace.connected_source_net_ids?.length ?? 0) > 0) {
        isInNet = true
      }
    }

    if (!netId) return

    const startPoint = { x: port.x, y: port.y }
    const nearestPoint = findNearestPointInNet(
      startPoint,
      port.pcb_port_id,
      netId,
    )

    if (!nearestPoint) return

    lines.push({
      key: `${port.pcb_port_id}-${index}`,
      startPoint,
      endPoint: nearestPoint,
      isInNet,
    })
  })

  return lines
}

export const RatsNestOverlay = ({
  transform,
  soup,
  connectivityMap,
  children,
}: Props) => {
  const isShowingRatsNest = useGlobalStore((s) => s.is_showing_rats_nest)
  const { netMap, idToNetMap } = connectivityMap

  const ratsNestLines = useMemo(() => {
    if (!soup || !isShowingRatsNest) return []
    return computeRatsNestLines({ soup, netMap, idToNetMap })
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
