import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import type { ReactElement } from "react"

/**
 * A differential pair that hops to the bottom layer across x ∈ [-6, 6]
 * (in step, white) while an ordinary 0.5 mm top copper trace covers DP
 * across x ∈ [-2, 2] at y = 0.3, leaving DN at y = -0.3 and DP at x = -4
 * uncovered.
 */
export function CopperCrossingBoard(): ReactElement {
  const viaHopPath = [
    {
      x: 6,
      y: 0,
      via: true,
      fromLayer: "top" as const,
      toLayer: "bottom" as const,
    },
    {
      x: 18,
      y: 0,
      via: true,
      fromLayer: "bottom" as const,
      toLayer: "top" as const,
    },
  ]
  return (
    <board width="40mm" height="20mm">
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
        pcbPath={viaHopPath}
      />
      <trace
        name="DN"
        from=".TN_SRC > .pin1"
        to=".TN_LOAD > .pin1"
        thickness="0.15mm"
        pcbPath={viaHopPath}
      />
      <differentialpair
        name="PAIR"
        positiveConnection="DP"
        negativeConnection="DN"
        pcbTraceGap="0.45mm"
      />
      <testpoint
        name="CROSS_L"
        footprintVariant="pad"
        padDiameter="0.5mm"
        doNotPlace
        pcbX={-2}
        pcbY={0.3}
      />
      <testpoint
        name="CROSS_R"
        footprintVariant="pad"
        padDiameter="0.5mm"
        doNotPlace
        pcbX={2}
        pcbY={0.3}
      />
      <trace
        name="CROSS"
        from=".CROSS_L > .pin1"
        to=".CROSS_R > .pin1"
        thickness="0.5mm"
        pcbPath={[]}
      />
    </board>
  )
}

/** Renders {@link CopperCrossingBoard} through core. */
export function renderCopperCrossingBoard(): CircuitJson {
  const circuit = new Circuit()
  circuit.add(<CopperCrossingBoard />)
  return circuit.getCircuitJson()
}
