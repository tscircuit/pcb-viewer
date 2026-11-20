import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import type { ReactElement } from "react"

/** A matched bottom-layer pair under top traces and a round-cornered pad. */
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
      <pcbtrace
        route={[
          { route_type: "wire", x: -5, y: 0, width: 0.9, layer: "top" },
          { route_type: "wire", x: -3, y: 0, width: 0.15, layer: "top" },
        ]}
      />
      <pcbtrace
        route={[
          { route_type: "wire", x: -2, y: 0, width: 0.15, layer: "top" },
          { route_type: "wire", x: 0, y: 0, width: 0.9, layer: "top" },
        ]}
      />
      <smtpad
        shape="rect"
        layer="top"
        pcbX={2.5}
        pcbY={-0.4}
        width={2}
        height={2}
        cornerRadius={1}
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
