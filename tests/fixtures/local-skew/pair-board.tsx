import { Circuit } from "@tscircuit/core"
import type { CircuitJson, LayerRef } from "circuit-json"
import type { ReactElement } from "react"

/** A `pcbPath` point, relative to the trace's start port. */
export type PairPathPoint = {
  x: number
  y: number
  via?: boolean
  fromLayer?: LayerRef
  toLayer?: LayerRef
}

/** Options for {@link PairBoard}. */
export type PairBoardProps = {
  positivePath: PairPathPoint[]
  negativePath: PairPathPoint[]
  /** Edge-to-edge gap, e.g. "0.45mm". Leave out to test an undeclared gap. */
  pcbTraceGap?: string
  /** Route the negative trace from its load pad back to its source pad. */
  negativeFromLoad?: boolean
  /** Declare the positive trace as both members, which core accepts. */
  positiveOnBothSides?: boolean
}

/**
 * A two-layer board with source pads at x = -12 and load pads at x = 12.
 * The positive trace's pads are at y = 0.3 and the negative's at y = -0.3,
 * so a straight pair is 0.6 mm apart centre to centre with 0.15 mm traces.
 */
export function PairBoard({
  positivePath,
  negativePath,
  pcbTraceGap,
  negativeFromLoad,
  positiveOnBothSides,
}: PairBoardProps): ReactElement {
  let negativeFrom = ".TN_SRC > .pin1"
  let negativeTo = ".TN_LOAD > .pin1"
  if (negativeFromLoad) {
    negativeFrom = ".TN_LOAD > .pin1"
    negativeTo = ".TN_SRC > .pin1"
  }
  let negativeConnection = "DN"
  if (positiveOnBothSides) negativeConnection = "DP"
  return (
    <board width="40mm" height="20mm" layers={2}>
      <testpoint
        name="TP_SRC"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={-12}
        pcbY={0.3}
      />
      <testpoint
        name="TN_SRC"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={-12}
        pcbY={-0.3}
      />
      <testpoint
        name="TP_LOAD"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={12}
        pcbY={0.3}
      />
      <testpoint
        name="TN_LOAD"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={12}
        pcbY={-0.3}
      />
      <trace
        name="DP"
        from=".TP_SRC > .pin1"
        to=".TP_LOAD > .pin1"
        thickness="0.15mm"
        pcbPath={positivePath}
      />
      <trace
        name="DN"
        from={negativeFrom}
        to={negativeTo}
        thickness="0.15mm"
        pcbPath={negativePath}
      />
      <differentialpair
        name="PAIR"
        positiveConnection="DP"
        negativeConnection={negativeConnection}
        pcbTraceGap={pcbTraceGap}
      />
    </board>
  )
}

/** Renders {@link PairBoard} through core. */
export function renderPairBoard(props: PairBoardProps): CircuitJson {
  const circuit = new Circuit()
  circuit.add(<PairBoard {...props} />)
  return circuit.getCircuitJson() as CircuitJson
}
