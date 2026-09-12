import type {
  AnyCircuitElement,
  PcbPort,
  Point,
  SourceTrace,
} from "circuit-json"
import {
  type ConnectivityMap,
  getSourcePortConnectivityMapFromCircuitJson,
  PcbConnectivityMap,
} from "circuit-json-to-connectivity-map"

type PcbPortId = PcbPort["pcb_port_id"]
type SourcePortId = PcbPort["source_port_id"]
type SourceNetId = SourceTrace["connected_source_net_ids"][number]
type SourceConnectivityNetId = keyof ConnectivityMap["netMap"]
type RoutedIslandId = `routed:${string}` | `port:${PcbPortId}`
type IslandParents = Map<RoutedIslandId, RoutedIslandId>

export type UnconnectedRatsNestLine = {
  key: string
  startPoint: Point
  endPoint: Point
  isInNet: boolean
  startPcbPortId: PcbPortId
  endPcbPortId: PcbPortId
}

type IslandConnection = {
  start: PcbPort
  end: PcbPort
  distanceSquared: number
}

function findRoutedIslandRoot(
  islandId: RoutedIslandId,
  parents: IslandParents,
) {
  let root = islandId
  while (parents.has(root)) root = parents.get(root)!
  let currentIslandId = islandId
  while (parents.has(currentIslandId)) {
    const parent = parents.get(currentIslandId)!
    parents.set(currentIslandId, root)
    currentIslandId = parent
  }
  return root
}

function connectIslandsWithAirwires({
  ports,
  islandByPcbPort,
  physicalIslandParents,
  isInNet,
}: {
  ports: PcbPort[]
  islandByPcbPort: Map<PcbPortId, RoutedIslandId>
  physicalIslandParents: IslandParents
  isInNet: boolean
}): UnconnectedRatsNestLine[] {
  const remainingIslands = new Map<RoutedIslandId, PcbPort[]>()
  for (const port of ports) {
    const islandId = findRoutedIslandRoot(
      islandByPcbPort.get(port.pcb_port_id)!,
      physicalIslandParents,
    )
    const islandPorts = remainingIslands.get(islandId) ?? []
    islandPorts.push(port)
    remainingIslands.set(islandId, islandPorts)
  }
  if (remainingIslands.size < 2) return []

  const [firstIslandId, firstIslandPorts] = remainingIslands.entries().next()
    .value!
  remainingIslands.delete(firstIslandId)
  let newlyConnectedPorts = firstIslandPorts
  const closestConnections = new Map<RoutedIslandId, IslandConnection>()
  const lines: UnconnectedRatsNestLine[] = []

  // Prim's algorithm keeps one best connection per remaining island instead
  // of allocating and sorting every pair of ports in a large power net.
  while (remainingIslands.size > 0) {
    for (const [islandId, islandPorts] of remainingIslands) {
      for (const start of newlyConnectedPorts) {
        for (const end of islandPorts) {
          const distanceSquared =
            (start.x - end.x) ** 2 + (start.y - end.y) ** 2
          const previousConnection = closestConnections.get(islandId)
          if (
            !previousConnection ||
            distanceSquared < previousConnection.distanceSquared
          ) {
            closestConnections.set(islandId, { start, end, distanceSquared })
          }
        }
      }
    }

    let nextIslandId: RoutedIslandId | undefined
    let nextConnection: IslandConnection | undefined
    for (const [islandId, connection] of closestConnections) {
      if (
        !nextConnection ||
        connection.distanceSquared < nextConnection.distanceSquared
      ) {
        nextIslandId = islandId
        nextConnection = connection
      }
    }
    const { start, end } = nextConnection!
    lines.push({
      key: `${start.pcb_port_id}-${end.pcb_port_id}`,
      startPoint: { x: start.x, y: start.y },
      endPoint: { x: end.x, y: end.y },
      startPcbPortId: start.pcb_port_id,
      endPcbPortId: end.pcb_port_id,
      isInNet,
    })
    newlyConnectedPorts = remainingIslands.get(nextIslandId!)!
    remainingIslands.delete(nextIslandId!)
    closestConnections.delete(nextIslandId!)
  }
  return lines
}

/**
 * Connect the disconnected PCB islands of each intended source net. Positions
 * are points in board coordinates (+X right, +Y up), in millimeters.
 * Routed trace segments and shared ports are resolved by PcbConnectivityMap;
 * source connectivity alone never makes an unrouted connection disappear.
 */
export function getUnconnectedRatsNestLines(
  circuitJson: AnyCircuitElement[],
): UnconnectedRatsNestLine[] {
  const sourceConnectivity =
    getSourcePortConnectivityMapFromCircuitJson(circuitJson)
  const pcbConnectivity = new PcbConnectivityMap(circuitJson)
  const portsBySourceNet = new Map<SourceConnectivityNetId, PcbPort[]>()
  const pcbPortsBySourcePort = new Map<SourcePortId, PcbPortId[]>()
  const islandByPcbPort = new Map<PcbPortId, RoutedIslandId>()
  const physicalIslandParents: IslandParents = new Map()
  const namedSourceNetIds = new Set<SourceNetId>()

  for (const element of circuitJson) {
    if (element.type === "pcb_port") {
      const pcbPorts = pcbPortsBySourcePort.get(element.source_port_id) ?? []
      pcbPorts.push(element.pcb_port_id)
      pcbPortsBySourcePort.set(element.source_port_id, pcbPorts)
      const routedNetId = pcbConnectivity.connMap.getNetConnectedToId(
        element.pcb_port_id,
      )
      islandByPcbPort.set(
        element.pcb_port_id,
        routedNetId ? `routed:${routedNetId}` : `port:${element.pcb_port_id}`,
      )
      const sourceNetId = sourceConnectivity.getNetConnectedToId(
        element.source_port_id,
      )
      if (sourceNetId) {
        const ports = portsBySourceNet.get(sourceNetId) ?? []
        ports.push(element)
        portsBySourceNet.set(sourceNetId, ports)
      }
    } else if (element.type === "source_trace") {
      for (const sourceNetId of element.connected_source_net_ids) {
        namedSourceNetIds.add(sourceNetId)
      }
    }
  }

  // Only explicit device-internal connections merge physical islands here.
  // Keep our own representatives: the dependency's incremental net-ID allocator
  // can overwrite an existing sparse ID when adding an unrelated internal group.
  for (const element of circuitJson) {
    const internalConnections =
      element.type === "source_component"
        ? (element.internally_connected_source_port_ids ?? [])
        : element.type === "source_component_internal_connection"
          ? [element.source_port_ids]
          : []
    for (const sourcePorts of internalConnections) {
      const pcbPorts = sourcePorts.flatMap(
        (sourcePort) => pcbPortsBySourcePort.get(sourcePort) ?? [],
      )
      if (pcbPorts.length < 2) continue
      const firstIsland = islandByPcbPort.get(pcbPorts[0])!
      for (const pcbPort of pcbPorts.slice(1)) {
        const firstRoot = findRoutedIslandRoot(
          firstIsland,
          physicalIslandParents,
        )
        const otherRoot = findRoutedIslandRoot(
          islandByPcbPort.get(pcbPort)!,
          physicalIslandParents,
        )
        if (firstRoot !== otherRoot)
          physicalIslandParents.set(otherRoot, firstRoot)
      }
    }
  }

  const lines: UnconnectedRatsNestLine[] = []
  for (const [sourceNetId, ports] of portsBySourceNet) {
    lines.push(
      ...connectIslandsWithAirwires({
        ports,
        islandByPcbPort,
        physicalIslandParents,
        isInNet: sourceConnectivity
          .getIdsConnectedToNet(sourceNetId)
          .some((sourceId) => namedSourceNetIds.has(sourceId)),
      }),
    )
  }
  return lines
}
