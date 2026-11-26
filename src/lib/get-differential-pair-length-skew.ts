import { createBoardOwnerMap } from "@tscircuit/circuit-json-util"
import type {
  AnyCircuitElement,
  LayerRef,
  PcbBoard,
  PcbPort,
  PcbStackup,
  PcbTrace,
  SourceBus,
  SourceTrace,
} from "circuit-json"

export interface DifferentialPairLengthSkew {
  sourceBusId: string
  name: string
  positiveTraceId?: string
  negativeTraceId?: string
  positiveLengthMm: number | null
  negativeLengthMm: number | null
  lengthSkewMm: number | null
  toleranceMm: number | null
  passesTolerance: boolean | null
}

type Point = { x: number; y: number }
type Vertex = Point & { layers: readonly [LayerRef, LayerRef?] }

const isNonnegativeNumber = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0

function indexBy<T>(
  elements: readonly T[],
  keyOf: (item: T) => string | undefined,
): Map<string, T[]> {
  const index = new Map<string, T[]>()
  for (const element of elements) {
    const key = keyOf(element)
    if (!key) continue
    const group = index.get(key)
    if (group) group.push(element)
    else index.set(key, [element])
  }
  return index
}

function only<T>(group: T[] | undefined) {
  return group?.length === 1 ? group[0] : undefined
}

function getLayerPosition(layer: LayerRef, count: number): number | null {
  if (layer === "top") return 0
  if (layer === "bottom") return count - 1
  if (!/^inner[1-9]\d*$/.test(layer)) return null
  const index = Number(layer.slice("inner".length))
  return index < count - 1 ? index : null
}

function getLayerChangeLength(
  from: LayerRef,
  to: LayerRef,
  board: PcbBoard | undefined,
  stackups: PcbStackup[] | undefined,
): number | null {
  if (from === to) return 0
  // Unknown board geometry is not a basis for a numerical tolerance result.
  if (!board || !Number.isInteger(board.num_layers) || board.num_layers < 2) {
    return null
  }
  const fromPosition = getLayerPosition(from, board.num_layers)
  const toPosition = getLayerPosition(to, board.num_layers)
  if (fromPosition === null || toPosition === null) return null
  if (stackups && stackups.length !== 1) return null
  const stackup = stackups?.[0]
  if (stackup) {
    const findLayer = (layer: LayerRef) =>
      stackup.layers.findIndex(
        (entry) => entry.layer_type === "copper" && entry.layer === layer,
      )
    const fromIndex = findLayer(from)
    const toIndex = findLayer(to)
    if (fromIndex !== -1 && toIndex !== -1) {
      const first = Math.min(fromIndex, toIndex)
      const last = Math.max(fromIndex, toIndex)
      let total = 0
      for (let index = first; index <= last; index++) {
        const entry = stackup.layers[index]!
        if (entry.layer_type === "soldermask") continue
        if (!isNonnegativeNumber(entry.thickness)) return null
        // Outer copper is counted fully; an inner endpoint is reached at its centre.
        const half =
          (index === first || index === last) &&
          entry.layer_type === "copper" &&
          entry.layer !== "top" &&
          entry.layer !== "bottom"
        total += half ? entry.thickness / 2 : entry.thickness
      }
      return total
    }
  }
  // Like the existing phase-skew walker, estimate evenly spaced copper without a stackup.
  const thickness = board.thickness
  if (!isNonnegativeNumber(thickness) || thickness === 0) return null
  return (
    (thickness * Math.abs(fromPosition - toPosition)) / (board.num_layers - 1)
  )
}

/** Follow Circuit JSON's route order, not overlay segments or the cached trace_length. */
function getCompleteTraceLength(
  trace: PcbTrace,
  terminals: readonly [PcbPort, PcbPort],
  board: PcbBoard | undefined,
  stackups: PcbStackup[] | undefined,
): number | null {
  const vertices: Vertex[] = []
  for (const point of trace.route) {
    if (point.route_type === "wire") {
      vertices.push({ x: point.x, y: point.y, layers: [point.layer] })
    } else if (point.route_type === "via") {
      vertices.push({
        x: point.x,
        y: point.y,
        layers: [point.from_layer, point.to_layer],
      })
    } else if (point.route_type === "through_pad") {
      vertices.push({ ...point.start, layers: [point.start_layer] })
      vertices.push({
        ...point.end,
        layers: [point.start_layer, point.end_layer],
      })
    } else {
      return null
    }
  }
  const start = vertices[0]
  const end = vertices.at(-1)
  if (!start || !end) return null
  const touches = (vertex: Vertex, port: PcbPort) =>
    Math.hypot(vertex.x - port.x, vertex.y - port.y) <= 1e-6 &&
    vertex.layers.some((layer) => layer && port.layers.includes(layer))

  const first = trace.route[0]
  const last = trace.route.at(-1)
  const startHint =
    first?.route_type === "wire" ? first.start_pcb_port_id : null
  const endHint = last?.route_type === "wire" ? last.end_pcb_port_id : null
  const orientations = [
    terminals,
    [terminals[1], terminals[0]] as const,
  ].filter(
    ([a, b]) =>
      (!startHint || startHint === a.pcb_port_id) &&
      (!endHint || endHint === b.pcb_port_id) &&
      touches(start, a) &&
      touches(end, b),
  )
  const orientation = only(orientations)
  if (!orientation) return null
  const [startPort, endPort] = orientation
  const possibleStartLayers = start.layers.filter(
    (layer): layer is LayerRef => !!layer && startPort.layers.includes(layer),
  )
  const startLayer = only([...new Set(possibleStartLayers)])
  if (!startLayer) return null
  let activeLayer = startLayer
  let length = 0
  for (const [index, vertex] of vertices.entries()) {
    if (!vertex.layers.includes(activeLayer)) return null
    if (!Number.isFinite(vertex.x) || !Number.isFinite(vertex.y)) return null
    const previous = vertices[index - 1]
    if (previous) {
      length += Math.hypot(vertex.x - previous.x, vertex.y - previous.y)
    }
    const [a, b] = vertex.layers
    if (!b || a === b) continue
    const nextLayer = activeLayer === a ? b : a
    const change = getLayerChangeLength(activeLayer, nextLayer, board, stackups)
    if (change === null) return null
    length += change
    activeLayer = nextLayer
  }

  if (!endPort.layers.includes(activeLayer)) return null
  return Number.isFinite(length) ? length : null
}

function getTraceTerminals(
  pcbPorts: Map<string, PcbPort[]>,
  sourceTrace: SourceTrace | undefined,
): [PcbPort, PcbPort] | null {
  const sourcePortIds = sourceTrace?.connected_source_port_ids
  if (!sourcePortIds || sourcePortIds.length !== 2) return null
  const [first, second] = sourcePortIds
  if (!first || !second || first === second) return null
  const start = only(pcbPorts.get(first))
  const end = only(pcbPorts.get(second))
  return start && end ? [start, end] : null
}

/** Summarize declared point-to-point pairs, including pairs without a local overlay. */
export function getDifferentialPairLengthSkews(
  elements: readonly AnyCircuitElement[],
): DifferentialPairLengthSkew[] {
  const buses = elements.filter(
    (
      element,
    ): element is SourceBus & {
      differential_pair: NonNullable<SourceBus["differential_pair"]>
    } => element.type === "source_bus" && !!element.differential_pair,
  )
  if (buses.length === 0) return []
  const pcbTraces = indexBy(
    elements.filter((element) => element.type === "pcb_trace"),
    (trace) => trace.source_trace_id,
  )
  const sourceTraces = indexBy(
    elements.filter((element) => element.type === "source_trace"),
    (trace) => trace.source_trace_id,
  )
  const pcbPorts = indexBy(
    elements.filter((element) => element.type === "pcb_port"),
    (port) => port.source_port_id,
  )
  const stackups = indexBy(
    elements.filter((element) => element.type === "pcb_stackup"),
    (stackup) => stackup.pcb_board_id,
  )
  const boardOwners = createBoardOwnerMap([...elements])
  const measure = (sourceTraceId: string, trace: PcbTrace | undefined) => {
    if (!trace) return null
    const terminals = getTraceTerminals(
      pcbPorts,
      only(sourceTraces.get(sourceTraceId)),
    )
    if (!terminals) return null
    const board = boardOwners.get(trace.pcb_trace_id)
    return getCompleteTraceLength(
      trace,
      terminals,
      board,
      board ? stackups.get(board.pcb_board_id) : undefined,
    )
  }
  return buses.map((bus) => {
    const { positive_source_trace_id: p, negative_source_trace_id: n } =
      bus.differential_pair
    const positive = p !== n ? only(pcbTraces.get(p)) : undefined
    const negative = p !== n ? only(pcbTraces.get(n)) : undefined
    const sameCopper =
      positive && negative && positive.pcb_trace_id === negative.pcb_trace_id
    const positiveLengthMm = sameCopper ? null : measure(p, positive)
    const negativeLengthMm = sameCopper ? null : measure(n, negative)
    const lengthSkewMm =
      positiveLengthMm === null || negativeLengthMm === null
        ? null
        : Math.abs(positiveLengthMm - negativeLengthMm)
    const toleranceMm = isNonnegativeNumber(bus.max_length_skew)
      ? bus.max_length_skew
      : null
    return {
      sourceBusId: bus.source_bus_id,
      name: bus.name || bus.source_bus_id,
      positiveTraceId: positive?.pcb_trace_id,
      negativeTraceId: negative?.pcb_trace_id,
      positiveLengthMm,
      negativeLengthMm,
      lengthSkewMm,
      toleranceMm,
      passesTolerance:
        lengthSkewMm === null || toleranceMm === null
          ? null
          : lengthSkewMm - toleranceMm <=
            Number.EPSILON *
              Math.max(1, positiveLengthMm ?? 0, negativeLengthMm ?? 0) *
              8,
    }
  })
}
