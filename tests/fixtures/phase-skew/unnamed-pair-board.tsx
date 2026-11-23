import { Circuit } from "@tscircuit/core"
import type { PcbPath } from "@tscircuit/props"
import type { CircuitJson } from "circuit-json"
import type { ReactElement } from "react"

/**
 * A differential pair whose traces have no names, so the trace
 * hover box has no name or length limit of its own to show.
 */
export function UnnamedPairBoard({
  positivePath = [],
}: { positivePath?: PcbPath }): ReactElement {
  return (
    <board width="30mm" height="8mm" routeRemaining={false}>
      <testpoint
        name="TP_P_SRC"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={-12}
        pcbY={0.3}
      />
      <testpoint
        name="TP_P_DST"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={12}
        pcbY={0.3}
      />
      <testpoint
        name="TP_N_SRC"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={-12}
        pcbY={-0.3}
      />
      <testpoint
        name="TP_N_DST"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={12}
        pcbY={-0.3}
      />
      <trace
        from=".TP_P_SRC > .pin1"
        to=".TP_P_DST > .pin1"
        thickness="0.15mm"
        pcbPath={positivePath}
      />
      <trace
        from=".TP_N_SRC > .pin1"
        to=".TP_N_DST > .pin1"
        thickness="0.15mm"
        pcbPath={[]}
      />
      <differentialpair
        positiveConnection=".TP_P_SRC > .pin1"
        negativeConnection=".TP_N_SRC > .pin1"
        pcbTraceGap="0.45mm"
      />
    </board>
  )
}

/** Renders {@link UnnamedPairBoard} through core. */
export function renderUnnamedPairBoard(positivePath?: PcbPath): CircuitJson {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(<UnnamedPairBoard positivePath={positivePath} />)
  circuit.render()
  return circuit.getCircuitJson() as CircuitJson
}
