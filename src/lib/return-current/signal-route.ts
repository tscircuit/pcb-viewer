import type {
  AnyCircuitElement,
  LayerRef,
  PcbPort,
  PcbTrace,
} from "circuit-json"

const tolerance = 1e-6
const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y) <= tolerance

type Wire = Extract<PcbTrace["route"][number], { route_type: "wire" }>

/** A solver-only view of existing copper. Original PCB records are never edited. */
export interface ResolvedSignalRoute {
  pcb_trace_id: string
  route: PcbTrace["route"]
}

/** Follow one source trace's physical fragments through actual plated vias.
 * Through-via stubs are retained in the board, but do not create signal branches.
 * A shared source net alone never bridges a gap in routed copper.
 */
export function resolveSignalRoute(
  circuitJson: readonly AnyCircuitElement[],
  selected: PcbTrace,
  terminalPorts: PcbPort[],
): { trace: PcbTrace; source: PcbPort; load: PcbPort } {
  const traces = circuitJson.filter(
    (element): element is PcbTrace =>
      element.type === "pcb_trace" &&
      element.source_trace_id === selected.source_trace_id,
  )
  const traceIds = new Set(traces.map((trace) => trace.pcb_trace_id))
  const vias = circuitJson.filter(
    (element) =>
      element.type === "pcb_via" &&
      element.pcb_trace_id &&
      traceIds.has(element.pcb_trace_id),
  )
  const nodes: {
    x: number
    y: number
    layers: LayerRef[]
    via?: (typeof vias)[number]
    edges: number[]
  }[] = []
  const nodeFor = (point: Wire) => {
    const matches = vias.filter(
      (via) =>
        via.type === "pcb_via" &&
        near(via, point) &&
        via.layers.includes(point.layer),
    )
    if (matches.length > 1)
      throw new Error("Multiple plated vias occupy one signal junction.")
    const via = matches[0]
    const index = nodes.findIndex(
      (node) => near(node, point) && node.layers.includes(point.layer),
    )
    if (index >= 0) return index
    nodes.push({
      x: point.x,
      y: point.y,
      layers: via?.type === "pcb_via" ? via.layers : [point.layer],
      via,
      edges: [],
    })
    return nodes.length - 1
  }
  const edges: {
    a: number
    b: number
    start: Wire
    end: Wire
    traceId: string
  }[] = []
  const selectedNodes = new Set<number>()
  for (const trace of traces) {
    if (trace.route.some((point) => point.route_type === "through_pad"))
      throw new Error(
        "Through-pad trace routes are not supported by the EM solver.",
      )
    for (const point of trace.route) {
      if (
        point.route_type === "wire" &&
        trace.pcb_trace_id === selected.pcb_trace_id
      )
        selectedNodes.add(nodeFor(point))
      if (
        point.route_type === "via" &&
        !vias.some(
          (via) =>
            via.type === "pcb_via" &&
            near(via, point) &&
            via.layers.includes(point.from_layer) &&
            via.layers.includes(point.to_layer),
        )
      )
        throw new Error(
          "A signal layer transition has no matching physical plated via.",
        )
    }
    for (let i = 1; i < trace.route.length; i++) {
      const start = trace.route[i - 1],
        end = trace.route[i]
      if (start.route_type !== "wire" || end.route_type !== "wire") continue
      if (start.layer !== end.layer)
        throw new Error("Signal layer changes require a plated via.")
      if (near(start, end)) continue
      const a = nodeFor(start),
        b = nodeFor(end)
      const duplicate = edges.find(
        (edge) =>
          edge.start.layer === start.layer &&
          ((edge.a === a && edge.b === b) || (edge.a === b && edge.b === a)),
      )
      if (duplicate) {
        if (Math.abs(duplicate.start.width - start.width) > tolerance)
          throw new Error(
            "Overlapping signal fragments disagree on copper width.",
          )
        continue
      }
      nodes[a].edges.push(edges.length)
      nodes[b].edges.push(edges.length)
      edges.push({ a, b, start, end, traceId: trace.pcb_trace_id })
    }
  }
  // A junction on a segment's interior cannot be treated as a separate endpoint.
  // Reject it rather than choosing one branch or silently skipping copper.
  for (const edge of edges) {
    const dx = edge.end.x - edge.start.x,
      dy = edge.end.y - edge.start.y
    const length2 = dx * dx + dy * dy
    for (const [index, node] of nodes.entries()) {
      if (
        index === edge.a ||
        index === edge.b ||
        !node.layers.includes(edge.start.layer)
      )
        continue
      const t =
        ((node.x - edge.start.x) * dx + (node.y - edge.start.y) * dy) / length2
      if (
        t > 0 &&
        t < 1 &&
        Math.hypot(
          node.x - edge.start.x - t * dx,
          node.y - edge.start.y - t * dy,
        ) <= tolerance
      )
        throw new Error(
          "This signal has an intermediate copper junction; choose an unbranched two-pin connection.",
        )
    }
  }
  const seed = [...selectedNodes].find((index) => nodes[index].edges.length)
  if (seed === undefined)
    throw new Error(
      "The selected trace has no connected routed signal segment.",
    )
  const connected = new Set<number>()
  const pending = [seed]
  for (let i = 0; i < pending.length; i++) {
    const index = pending[i]
    if (connected.has(index)) continue
    connected.add(index)
    for (const edgeId of nodes[index].edges) {
      const edge = edges[edgeId]
      pending.push(edge.a === index ? edge.b : edge.a)
    }
  }
  if (
    [...selectedNodes].some(
      (index) => nodes[index].edges.length && !connected.has(index),
    )
  )
    throw new Error(
      "The selected signal contains disconnected copper fragments.",
    )
  const ends = [...connected].filter((index) => nodes[index].edges.length === 1)
  if (
    ends.length !== 2 ||
    [...connected].some((index) => nodes[index].edges.length > 2)
  )
    throw new Error(
      "This signal has branched or cyclic copper; choose an unbranched two-pin connection.",
    )
  const endpoint = (index: number) => {
    const edge = edges[nodes[index].edges[0]]
    const point = edge.a === index ? edge.start : edge.end
    const explicit =
      edge.a === index ? point.start_pcb_port_id : point.end_pcb_port_id
    const matches = terminalPorts.filter(
      (port) =>
        near(port, point) &&
        port.layers.includes(point.layer) &&
        (!explicit || port.pcb_port_id === explicit),
    )
    if (matches.length !== 1)
      throw new Error(
        "Signal endpoint must match exactly one physical pad on its route layer; the routed connection may be incomplete.",
      )
    return matches[0]
  }
  // Stable orientation from the source pin IDs, independent of which fragment was clicked.
  ends.sort((a, b) =>
    endpoint(a).pcb_port_id.localeCompare(endpoint(b).pcb_port_id, undefined, {
      numeric: true,
    }),
  )
  const source = endpoint(ends[0]),
    load = endpoint(ends[1])
  if (
    source.pcb_port_id === load.pcb_port_id ||
    source.source_port_id === load.source_port_id
  )
    throw new Error(
      "The signal connection must have two distinct endpoint pads.",
    )
  const route: PcbTrace["route"] = []
  let current = ends[0],
    previousEdge = -1
  while (current !== ends[1]) {
    const edgeId = nodes[current].edges.find((id) => id !== previousEdge)!
    const edge = edges[edgeId]
    const forward = edge.a === current
    const start = forward ? edge.start : edge.end
    const end = forward ? edge.end : edge.start
    const last = route.at(-1)
    if (last?.route_type === "wire" && last.layer !== start.layer) {
      const via = nodes[current].via
      if (via?.type !== "pcb_via")
        throw new Error("Signal layer changes require a plated via.")
      route.push({
        route_type: "via",
        x: via.x,
        y: via.y,
        from_layer: last.layer,
        to_layer: start.layer,
      })
    }
    // Preserve each segment's original width in either traversal direction.
    route.push({
      route_type: "wire",
      x: start.x,
      y: start.y,
      layer: start.layer,
      width: edge.start.width,
    })
    route.push({
      route_type: "wire",
      x: end.x,
      y: end.y,
      layer: end.layer,
      width: edge.start.width,
    })
    previousEdge = edgeId
    current = forward ? edge.b : edge.a
  }
  const first = route[0] as Wire,
    last = route.at(-1) as Wire
  first.start_pcb_port_id = source.pcb_port_id
  last.end_pcb_port_id = load.pcb_port_id
  return { trace: { ...selected, route }, source, load }
}
