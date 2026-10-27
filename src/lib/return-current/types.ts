/** Requests a simulation of the exact routed trace chosen in the PCB context menu. */
export interface SimulateReturnCurrentEvent {
  pcbTraceId: string
}

/** Selects one completed return-current result without changing the base PCB. */
export interface ReturnCurrentSimulationOptions {
  resultId: string
  layer: string
  showHeatmap?: boolean
  showVectors?: boolean
  opacity?: number
  pcbTraceId?: string
}
