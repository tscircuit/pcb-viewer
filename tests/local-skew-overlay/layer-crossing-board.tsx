import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import type { ReactElement } from "react"

/**
 * Two crossing differential pairs on different copper layers:
 * - TOP_PAIR runs horizontally on the top layer, with TOP_DP detouring early
 *   so it renders pure blue at (-4, 0.3) and at the crossing (0, 0.3).
 * - BOT_PAIR runs vertically on the bottom layer in step, so BOT_DP renders
 *   pure white at (0, 4) and at the crossing (0, 0.3).
 */
export function LayerCrossingBoard(): ReactElement {
  return (
    <board routeRemaining={false} width="24mm" height="16mm">
      <testpoint
        name="TOP_DP_SRC"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={-9}
        pcbY={0.3}
      />
      <testpoint
        name="TOP_DN_SRC"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={-9}
        pcbY={-0.3}
      />
      <testpoint
        name="TOP_DP_LOAD"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={9}
        pcbY={0.3}
      />
      <testpoint
        name="TOP_DN_LOAD"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={9}
        pcbY={-0.3}
      />
      <trace
        name="TOP_DP"
        from=".TOP_DP_SRC > .pin1"
        to=".TOP_DP_LOAD > .pin1"
        thickness="0.25mm"
        pcbPath={[
          { x: 2, y: 0 },
          { x: 2.5, y: 1.2 },
          { x: 3, y: 0 },
        ]}
      />
      <trace
        name="TOP_DN"
        from=".TOP_DN_SRC > .pin1"
        to=".TOP_DN_LOAD > .pin1"
        thickness="0.25mm"
        pcbPath={[]}
      />
      <differentialpair
        name="TOP_PAIR"
        positiveConnection="TOP_DP"
        negativeConnection="TOP_DN"
        pcbTraceGap="0.35mm"
      />

      <testpoint
        name="BOT_DP_SRC"
        footprintVariant="pad"
        padDiameter="0.3mm"
        layer="bottom"
        doNotPlace
        pcbX={0}
        pcbY={-6}
      />
      <testpoint
        name="BOT_DN_SRC"
        footprintVariant="pad"
        padDiameter="0.3mm"
        layer="bottom"
        doNotPlace
        pcbX={0.6}
        pcbY={-6}
      />
      <testpoint
        name="BOT_DP_LOAD"
        footprintVariant="pad"
        padDiameter="0.3mm"
        layer="bottom"
        doNotPlace
        pcbX={0}
        pcbY={6}
      />
      <testpoint
        name="BOT_DN_LOAD"
        footprintVariant="pad"
        padDiameter="0.3mm"
        layer="bottom"
        doNotPlace
        pcbX={0.6}
        pcbY={6}
      />
      <trace
        name="BOT_DP"
        from=".BOT_DP_SRC > .pin1"
        to=".BOT_DP_LOAD > .pin1"
        thickness="0.25mm"
        pcbPath={[]}
      />
      <trace
        name="BOT_DN"
        from=".BOT_DN_SRC > .pin1"
        to=".BOT_DN_LOAD > .pin1"
        thickness="0.25mm"
        pcbPath={[]}
      />
      <differentialpair
        name="BOT_PAIR"
        positiveConnection="BOT_DP"
        negativeConnection="BOT_DN"
        pcbTraceGap="0.35mm"
      />
    </board>
  )
}

/** Renders {@link LayerCrossingBoard} through core. */
export function renderLayerCrossingBoard(): CircuitJson {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(<LayerCrossingBoard />)
  return circuit.getCircuitJson() as CircuitJson
}
