import {
  simulation_experiment,
  simulation_return_current_excitation,
  type AnyCircuitElement,
  type LayerRef,
  type PcbPort,
  type PcbTrace,
  type SimulationReturnCurrentPortContact,
} from "circuit-json"

const positionToleranceMm = 1e-6

export interface ReturnCurrentPortCandidate {
  pcbPortId: PcbPort["pcb_port_id"]
  sourcePortId: PcbPort["source_port_id"]
  label: string
  /** Emitted board-world position: millimeters, +X right, +Y up. */
  x: number
  y: number
  layers: LayerRef[]
  sourceNetIds: string[]
  sourceNets: { sourceNetId: string; label: string; isGround: boolean }[]
}

export interface ReturnCurrentTraceTerminals {
  pcbTraceId: PcbTrace["pcb_trace_id"]
  /** Route-first and route-last are initial choices, not inferred driver roles. */
  sourcePcbPortId: PcbPort["pcb_port_id"]
  loadPcbPortId: PcbPort["pcb_port_id"]
  source: ReturnCurrentPortCandidate
  load: ReturnCurrentPortCandidate
}

/** Resolve net membership through explicit source traces, as the simulator does.
 * Pin names, component ownership and spatial proximity never create connections.
 */
function createSourceNetLookup(circuitJson: readonly AnyCircuitElement[]) {
  const connections = new Map<string, Set<string>>()
  const nodeForPort = (id: string) => `port:${id}`
  const nodeForNet = (id: string) => `net:${id}`
  for (const element of circuitJson) {
    if (element.type !== "source_trace") continue
    const nodes = [
      ...element.connected_source_port_ids.map(nodeForPort),
      ...element.connected_source_net_ids.map(nodeForNet),
    ]
    const first = nodes[0]
    if (!first) continue
    for (const node of nodes) {
      if (!connections.has(first)) connections.set(first, new Set())
      if (!connections.has(node)) connections.set(node, new Set())
      connections.get(first)!.add(node)
      connections.get(node)!.add(first)
    }
  }
  const cache = new Map<string, string[]>()
  return (sourcePortId: string): string[] => {
    const start = nodeForPort(sourcePortId)
    const previous = cache.get(start)
    if (previous) return previous
    const visited = new Set<string>()
    const pending = [start]
    for (let index = 0; index < pending.length; index++) {
      const node = pending[index]
      if (visited.has(node)) continue
      visited.add(node)
      for (const connected of connections.get(node) ?? [])
        if (!visited.has(connected)) pending.push(connected)
    }
    const netIds = [...visited]
      .filter((node) => node.startsWith("net:"))
      .map((node) => node.slice(4))
    for (const node of visited) cache.set(node, netIds)
    return netIds
  }
}

function hasPhysicalPad(
  circuitJson: readonly AnyCircuitElement[],
  pcbPort: PcbPort,
  layer?: LayerRef,
) {
  return circuitJson.some((element) => {
    if (
      (element.type !== "pcb_smtpad" && element.type !== "pcb_plated_hole") ||
      element.pcb_port_id !== pcbPort.pcb_port_id
    )
      return false
    return (
      layer === undefined ||
      (element.type === "pcb_smtpad"
        ? element.layer === layer
        : element.layers.includes(layer))
    )
  })
}

function getPhysicalPort(
  circuitJson: readonly AnyCircuitElement[],
  pcbPortId: PcbPort["pcb_port_id"],
  role: string,
): PcbPort {
  const matches = circuitJson.filter(
    (element): element is PcbPort =>
      element.type === "pcb_port" && element.pcb_port_id === pcbPortId,
  )
  const port = matches[0]
  if (
    matches.length !== 1 ||
    !Number.isFinite(port.x) ||
    !Number.isFinite(port.y) ||
    !port.layers.length ||
    !hasPhysicalPad(circuitJson, port)
  )
    throw new Error(`${role} must identify one existing physical PCB pad.`)
  if (
    circuitJson.filter(
      (element) =>
        element.type === "source_port" &&
        element.source_port_id === port.source_port_id,
    ).length !== 1
  )
    throw new Error(`${role} needs an unambiguous source pin.`)
  return port
}

function describePort(
  circuitJson: readonly AnyCircuitElement[],
  pcbPort: PcbPort,
  netIdsForPort: ReturnType<typeof createSourceNetLookup>,
): ReturnCurrentPortCandidate {
  const sourcePort = circuitJson.find(
    (element) =>
      element.type === "source_port" &&
      element.source_port_id === pcbPort.source_port_id,
  )
  const component =
    sourcePort?.type === "source_port"
      ? circuitJson.find(
          (element) =>
            element.type === "source_component" &&
            element.source_component_id === sourcePort.source_component_id,
        )
      : undefined
  const pinName =
    sourcePort?.type === "source_port"
      ? sourcePort.most_frequently_referenced_by_name || sourcePort.name
      : ""
  const label =
    component?.type === "source_component" && component.name
      ? `${component.name}.${pinName || "unnamed pin"}`
      : pinName || "Unnamed PCB pad"
  const sourceNetIds = [...netIdsForPort(pcbPort.source_port_id)]
  const sourceNets = circuitJson.flatMap((element) =>
    element.type === "source_net" &&
    sourceNetIds.includes(element.source_net_id)
      ? [
          {
            sourceNetId: element.source_net_id,
            label: element.name || "Unnamed net",
            isGround: element.is_ground === true,
          },
        ]
      : [],
  )
  return {
    pcbPortId: pcbPort.pcb_port_id,
    sourcePortId: pcbPort.source_port_id,
    label,
    x: pcbPort.x,
    y: pcbPort.y,
    layers: [...new Set(pcbPort.layers)],
    sourceNetIds,
    sourceNets,
  }
}

/** Return the two real pads at a complete, unbranched trace's route endpoints.
 * Coordinates/layers come from emitted PCB records; no transforms are reapplied.
 */
export function getReturnCurrentTraceTerminals(
  circuitJson: readonly AnyCircuitElement[],
  pcbTraceId: PcbTrace["pcb_trace_id"],
): ReturnCurrentTraceTerminals {
  const traces = circuitJson.filter(
    (element): element is PcbTrace =>
      element.type === "pcb_trace" && element.pcb_trace_id === pcbTraceId,
  )
  if (traces.length !== 1)
    throw new Error("Select one existing routed PCB trace.")
  const trace = traces[0]
  const sourceTraces = circuitJson.filter(
    (element) =>
      element.type === "source_trace" &&
      element.source_trace_id === trace.source_trace_id,
  )
  const sourceTrace = sourceTraces[0]
  if (
    sourceTraces.length !== 1 ||
    sourceTrace.type !== "source_trace" ||
    new Set(sourceTrace.connected_source_port_ids).size !== 2
  )
    throw new Error(
      "Return-current simulation needs one complete two-pin connection; split or branched routes are unsupported.",
    )
  if (trace.route.some((point) => point.route_type === "through_pad"))
    throw new Error(
      "Through-pad trace routes are not supported by the EM solver.",
    )
  const first = trace.route[0]
  const last = trace.route.at(-1)
  if (
    trace.route.length < 2 ||
    first?.route_type !== "wire" ||
    last?.route_type !== "wire"
  )
    throw new Error(
      "The selected trace must start and end at physical PCB pads.",
    )

  const resolveEndpoint = (
    point: typeof first,
    explicitId: string | undefined,
    role: string,
  ) => {
    const matches = circuitJson.filter(
      (element): element is PcbPort =>
        element.type === "pcb_port" &&
        (!explicitId || element.pcb_port_id === explicitId) &&
        sourceTrace.connected_source_port_ids.includes(
          element.source_port_id,
        ) &&
        Math.hypot(element.x - point.x, element.y - point.y) <=
          positionToleranceMm &&
        element.layers.includes(point.layer) &&
        hasPhysicalPad(circuitJson, element, point.layer),
    )
    if (matches.length !== 1)
      throw new Error(
        `${role} endpoint must match exactly one physical pad on its route layer.`,
      )
    return getPhysicalPort(circuitJson, matches[0].pcb_port_id, role)
  }
  const source = resolveEndpoint(first, first.start_pcb_port_id, "First signal")
  const load = resolveEndpoint(last, last.end_pcb_port_id, "Last signal")
  if (
    source.pcb_port_id === load.pcb_port_id ||
    source.source_port_id === load.source_port_id
  )
    throw new Error(
      "The signal connection must have two distinct endpoint pads.",
    )
  const netIdsForPort = createSourceNetLookup(circuitJson)
  return {
    pcbTraceId,
    sourcePcbPortId: source.pcb_port_id,
    loadPcbPortId: load.pcb_port_id,
    source: describePort(circuitJson, source, netIdsForPort),
    load: describePort(circuitJson, load, netIdsForPort),
  }
}

/** List actual net-connected pads. Passing a net filters by electrical
 * connectivity; omitting it lets the caller choose a net without assuming GND.
 */
export function getReturnCurrentGroundCandidates(
  circuitJson: readonly AnyCircuitElement[],
  groundSourceNetId?: string,
): ReturnCurrentPortCandidate[] {
  const netIdsForPort = createSourceNetLookup(circuitJson)
  return circuitJson.flatMap((element) => {
    if (element.type !== "pcb_port" || !hasPhysicalPad(circuitJson, element))
      return []
    const candidate = describePort(circuitJson, element, netIdsForPort)
    return candidate.sourceNets.length &&
      (!groundSourceNetId || candidate.sourceNetIds.includes(groundSourceNetId))
      ? [candidate]
      : []
  })
}

export interface CreateReturnCurrentExperimentFromTraceOptions {
  circuitJson: readonly AnyCircuitElement[]
  pcbTraceId: PcbTrace["pcb_trace_id"]
  sourcePcbPortId: PcbPort["pcb_port_id"]
  loadPcbPortId: PcbPort["pcb_port_id"]
  returnSourcePcbPortId: PcbPort["pcb_port_id"]
  returnSinkPcbPortId: PcbPort["pcb_port_id"]
  groundSourceNetId: string
  /** Positive in-phase peak amperes, not RMS. No amplitude is inferred. */
  sourceCurrentA: number
  sourceResistanceOhms: number
  loadResistanceOhms: number
  returnSourceLayer?: LayerRef
  returnSinkLayer?: LayerRef
  name?: string
}

/** Append a pending experiment without modifying any original PCB record.
 * Return source is load-side GND; return sink is driver-side GND. Frequency,
 * sampling, mesh and material settings belong to the separate solver request.
 */
export function createReturnCurrentExperimentFromTrace(
  options: CreateReturnCurrentExperimentFromTraceOptions,
): {
  circuitJson: AnyCircuitElement[]
  experimentId: string
  excitationId: string
} {
  const { circuitJson } = options
  const existingIds = new Set<string>()
  for (const element of circuitJson) {
    const id = (element as unknown as Record<string, unknown>)[
      `${element.type}_id`
    ]
    if (typeof id !== "string") continue
    if (existingIds.has(id))
      throw new Error("The board contains duplicate element identifiers.")
    existingIds.add(id)
  }
  if (
    circuitJson.filter((element) => element.type === "pcb_board").length !== 1
  )
    throw new Error(
      "Return-current simulation currently supports one PCB board.",
    )
  const terminals = getReturnCurrentTraceTerminals(
    circuitJson,
    options.pcbTraceId,
  )
  const signalIds = new Set([
    terminals.sourcePcbPortId,
    terminals.loadPcbPortId,
  ])
  if (
    options.sourcePcbPortId === options.loadPcbPortId ||
    !signalIds.has(options.sourcePcbPortId) ||
    !signalIds.has(options.loadPcbPortId)
  )
    throw new Error(
      "Choose the driver and load from the selected trace endpoints.",
    )
  if (
    new Set([
      options.sourcePcbPortId,
      options.loadPcbPortId,
      options.returnSourcePcbPortId,
      options.returnSinkPcbPortId,
    ]).size !== 4
  )
    throw new Error(
      "Signal and return terminals must be four distinct PCB pads.",
    )
  for (const [value, label] of [
    [options.sourceCurrentA, "Peak current"],
    [options.sourceResistanceOhms, "Source resistance"],
    [options.loadResistanceOhms, "Load resistance"],
  ] as const)
    if (!Number.isFinite(value) || value <= 0)
      throw new Error(`${label} must be finite and greater than zero.`)
  if (
    circuitJson.filter(
      (element) =>
        element.type === "source_net" &&
        element.source_net_id === options.groundSourceNetId,
    ).length !== 1
  )
    throw new Error("Choose one existing ground reference net.")

  const signalSource = getPhysicalPort(
    circuitJson,
    options.sourcePcbPortId,
    "Driver",
  )
  const signalLoad = getPhysicalPort(circuitJson, options.loadPcbPortId, "Load")
  const netIdsForPort = createSourceNetLookup(circuitJson)
  for (const signal of [signalSource, signalLoad])
    if (
      netIdsForPort(signal.source_port_id).includes(options.groundSourceNetId)
    )
      throw new Error(
        "The selected signal connection is electrically grounded.",
      )
  const contact = (
    pcbPortId: string,
    requestedLayer: LayerRef | undefined,
    role: string,
  ): SimulationReturnCurrentPortContact => {
    const port = getPhysicalPort(circuitJson, pcbPortId, role)
    if (!netIdsForPort(port.source_port_id).includes(options.groundSourceNetId))
      throw new Error(
        `${role} must be electrically connected to the selected ground net.`,
      )
    const layers = [...new Set(port.layers)]
    if (!requestedLayer && layers.length !== 1)
      throw new Error(
        `${role} spans multiple layers; choose its contact layer.`,
      )
    const layer = requestedLayer ?? layers[0]
    if (!layers.includes(layer) || !hasPhysicalPad(circuitJson, port, layer))
      throw new Error(
        `${role} has no physical pad on the selected contact layer.`,
      )
    return {
      contact_type: "pcb_port",
      pcb_port_id: port.pcb_port_id,
      x: port.x,
      y: port.y,
      layer,
    }
  }
  const returnSource = contact(
    options.returnSourcePcbPortId,
    options.returnSourceLayer,
    "Load-side ground",
  )
  const returnSink = contact(
    options.returnSinkPcbPortId,
    options.returnSinkLayer,
    "Driver-side ground",
  )
  for (const [signal, reference] of [
    [signalSource, returnSink],
    [signalLoad, returnSource],
  ] as const)
    if (
      signal.layers.includes(reference.layer) &&
      Math.hypot(signal.x - reference.x, signal.y - reference.y) <=
        positionToleranceMm
    )
      throw new Error(
        "A signal pad and its ground reference cannot coincide on the same layer.",
      )

  const newId = (prefix: string) => {
    let id: string
    do id = `${prefix}_${globalThis.crypto.randomUUID()}`
    while (existingIds.has(id))
    existingIds.add(id)
    return id
  }
  const experiment = simulation_experiment.parse({
    type: "simulation_experiment",
    simulation_experiment_id: newId("simulation_experiment"),
    experiment_type: "pcb_return_current",
    name:
      options.name?.trim() ||
      `Return current: ${
        options.sourcePcbPortId === terminals.sourcePcbPortId
          ? terminals.source.label
          : terminals.load.label
      } to ${
        options.loadPcbPortId === terminals.loadPcbPortId
          ? terminals.load.label
          : terminals.source.label
      }`,
  })
  const excitation = simulation_return_current_excitation.parse({
    type: "simulation_return_current_excitation",
    simulation_return_current_excitation_id: newId(
      "simulation_return_current_excitation",
    ),
    simulation_experiment_id: experiment.simulation_experiment_id,
    pcb_trace_id: options.pcbTraceId,
    ground_source_net_id: options.groundSourceNetId,
    current: options.sourceCurrentA,
    return_source: returnSource,
    return_sink: returnSink,
    source_port: {
      signal_pcb_port_id: signalSource.pcb_port_id,
      reference_pcb_port_id: returnSink.pcb_port_id,
      reference_layer: returnSink.layer,
      resistance: options.sourceResistanceOhms,
    },
    load_port: {
      signal_pcb_port_id: signalLoad.pcb_port_id,
      reference_pcb_port_id: returnSource.pcb_port_id,
      reference_layer: returnSource.layer,
      resistance: options.loadResistanceOhms,
    },
  })
  return {
    circuitJson: [...circuitJson, experiment, excitation],
    experimentId: experiment.simulation_experiment_id,
    excitationId: excitation.simulation_return_current_excitation_id,
  }
}
