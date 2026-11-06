import { type Matrix, applyToPoint, identity } from "transformation-matrix"
import type { AnyCircuitElement, PcbPort } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { useGlobalStore } from "../global-store"
import { zIndexMap } from "lib/util/z-index-map"
import {
  type ConnectivityMap,
  PcbConnectivityMap,
  getFullConnectivityMapFromCircuitJson,
} from "circuit-json-to-connectivity-map"
import { useMemo } from "react"

interface Props {
  transform?: Matrix
  soup?: AnyCircuitElement[]
  connectivityMap?: ConnectivityMap
  children: any
}

type Point = { x: number; y: number }
export type RatsNestLine = {
  key: string
  startPoint: Point
  endPoint: Point
  isInNet: boolean
}

export function getRatsNestLines({
  soup,
  connectivityMap,
  onlyUnconnected = false,
}: {
  soup: AnyCircuitElement[]
  connectivityMap?: ConnectivityMap
  onlyUnconnected?: boolean
}): RatsNestLine[] {
  const resolvedConnectivityMap =
    connectivityMap ?? getFullConnectivityMapFromCircuitJson(soup as any)
  const { netMap, idToNetMap } = resolvedConnectivityMap

  const pcbPorts = su(soup).pcb_port.list()
  const sourceTraces = su(soup).source_trace.list()

  const isPortInNamedNet = (port: PcbPort): boolean => {
    for (const trace of sourceTraces) {
      if (
        trace.connected_source_port_ids.includes(port.source_port_id) &&
        trace.connected_source_net_ids.length > 0
      ) {
        return true
      }
    }
    return false
  }

  if (!onlyUnconnected) {
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

    const lines: RatsNestLine[] = []

    pcbPorts.forEach((port, index) => {
      const netId = idToNetMap[port.pcb_port_id]
      if (!netId) return

      const startPoint = { x: port.x, y: port.y }
      const nearestPoint = findNearestPointInNet(startPoint, netId)
      if (!nearestPoint) return

      lines.push({
        key: `${port.pcb_port_id}-${index}`,
        startPoint,
        endPoint: nearestPoint,
        isInNet: isPortInNamedNet(port),
      })
    })

    return lines
  }

  const pcbConnMap = new PcbConnectivityMap(soup as any)
  const sourcePortToPcbPortIds = new Map<string, string[]>()
  for (const port of pcbPorts) {
    if (!port.source_port_id) continue
    const list = sourcePortToPcbPortIds.get(port.source_port_id) ?? []
    list.push(port.pcb_port_id)
    sourcePortToPcbPortIds.set(port.source_port_id, list)
  }

  for (const element of soup) {
    if (
      element.type === "source_component" &&
      "internally_connected_source_port_ids" in element &&
      Array.isArray(element.internally_connected_source_port_ids)
    ) {
      for (const group of element.internally_connected_source_port_ids) {
        const groupPcbPortIds = group.flatMap(
          (sourcePortId) => sourcePortToPcbPortIds.get(sourcePortId) ?? [],
        )
        if (groupPcbPortIds.length > 1) {
          pcbConnMap.connMap.addConnections([groupPcbPortIds])
        }
      }
    }
  }

  const netPortsMap = new Map<string, PcbPort[]>()
  for (const port of pcbPorts) {
    const netId =
      idToNetMap[port.pcb_port_id] ??
      (port.source_port_id ? idToNetMap[port.source_port_id] : undefined)
    if (!netId) continue
    const ports = netPortsMap.get(netId) ?? []
    ports.push(port)
    netPortsMap.set(netId, ports)
  }

  const lines: RatsNestLine[] = []

  for (const [netId, portsInNet] of netPortsMap.entries()) {
    if (portsInNet.length <= 1) continue

    const islands: PcbPort[][] = []
    for (const port of portsInNet) {
      const existingIsland = islands.find((island) =>
        island.some(
          (member) =>
            member.pcb_port_id === port.pcb_port_id ||
            pcbConnMap.connMap.areIdsConnected(
              member.pcb_port_id,
              port.pcb_port_id,
            ),
        ),
      )
      if (existingIsland) {
        existingIsland.push(port)
      } else {
        islands.push([port])
      }
    }

    if (islands.length <= 1) continue

    const isInNet = portsInNet.some((port) => isPortInNamedNet(port))
    const visited = new Set<number>([0])

    while (visited.size < islands.length) {
      let bestDist = Infinity
      let bestStart: PcbPort | null = null
      let bestEnd: PcbPort | null = null
      let bestIslandIndex = -1

      for (const u of visited) {
        for (let v = 0; v < islands.length; v++) {
          if (visited.has(v)) continue
          for (const portA of islands[u]!) {
            for (const portB of islands[v]!) {
              const dist = Math.hypot(portA.x - portB.x, portA.y - portB.y)
              if (dist < bestDist) {
                bestDist = dist
                bestStart = portA
                bestEnd = portB
                bestIslandIndex = v
              }
            }
          }
        }
      }

      if (!bestStart || !bestEnd || bestIslandIndex === -1) break
      visited.add(bestIslandIndex)
      lines.push({
        key: `${netId}-${bestStart.pcb_port_id}-${bestEnd.pcb_port_id}`,
        startPoint: { x: bestStart.x, y: bestStart.y },
        endPoint: { x: bestEnd.x, y: bestEnd.y },
        isInNet,
      })
    }
  }

  return lines
}

export const RatsNestOverlay = ({
  transform,
  soup,
  connectivityMap,
  children,
}: Props) => {
  const isShowingRatsNest = useGlobalStore((s) => s.is_showing_rats_nest)
  const isShowingOnlyUnconnectedRatsNest = useGlobalStore(
    (s) => s.is_showing_only_unconnected_rats_nest,
  )

  const ratsNestLines = useMemo(() => {
    if (!soup || !isShowingRatsNest) return []
    return getRatsNestLines({
      soup,
      connectivityMap,
      onlyUnconnected: isShowingOnlyUnconnectedRatsNest,
    })
  }, [
    soup,
    connectivityMap,
    isShowingRatsNest,
    isShowingOnlyUnconnectedRatsNest,
  ])

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
