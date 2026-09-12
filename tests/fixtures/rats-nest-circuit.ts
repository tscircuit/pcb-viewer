import type {
  AnyCircuitElement,
  PcbTrace,
  PcbTraceRoutePoint,
} from "circuit-json"

export function makeRatsNestCircuit(
  positions: [number, number][],
  nets: number[][] = [positions.map((_, index) => index)],
): AnyCircuitElement[] {
  return [
    ...positions.flatMap(([x, y], index): AnyCircuitElement[] => [
      {
        type: "source_port",
        source_port_id: `source_port_${index}`,
        source_component_id: `source_component_${index}`,
        name: "1",
        pin_number: 1,
      },
      {
        type: "pcb_port",
        pcb_port_id: `pcb_port_${index}`,
        source_port_id: `source_port_${index}`,
        pcb_component_id: `pcb_component_${index}`,
        x,
        y,
        layers: ["top"],
      },
    ]),
    ...nets.map(
      (ports, index): AnyCircuitElement => ({
        type: "source_trace",
        source_trace_id: `source_trace_${index}`,
        connected_source_port_ids: ports.map((port) => `source_port_${port}`),
        connected_source_net_ids: [],
      }),
    ),
  ]
}

export function makeRatsNestTrace(
  id: string,
  route: PcbTraceRoutePoint[],
): PcbTrace {
  return { type: "pcb_trace", pcb_trace_id: id, route }
}

export function wire(
  [x, y]: [number, number],
  props: Partial<Extract<PcbTraceRoutePoint, { route_type: "wire" }>> = {},
): Extract<PcbTraceRoutePoint, { route_type: "wire" }> {
  return { route_type: "wire", x, y, layer: "top", width: 0.2, ...props }
}
