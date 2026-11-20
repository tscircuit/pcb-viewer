import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import type { ReactElement } from "react"

/**
 * An asymmetric differential pair whose positive and negative peaks differ
 * by 5× so per-trace per-sign scaling and per-pair scaling produce visibly
 * different colours:
 * - Stretch A (x = -6): DP is +1.0 mm (DP's positive peak -> full blue under
 *   per-trace scaling, vs 20% pale blue under per-pair scaling); DN is -1.0 mm
 *   (DN's negative peak -> full red vs 20% pale pink).
 * - Stretch B (x = 0): DP is -2.5 mm (half of DP's -5.0 mm negative peak ->
 *   mid-pink); DN is +2.5 mm (half of DN's +5.0 mm positive peak -> mid-blue).
 * - Stretch C (x = 7): DP is -5.0 mm (full red); DN is +5.0 mm (full blue).
 */
export function AsymmetricSkewBoard(): ReactElement {
  return (
    <board width="26mm" height="10mm">
      <testpoint
        name="TP_SRC"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={-11}
        pcbY={0.3}
      />
      <testpoint
        name="TN_SRC"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={-11}
        pcbY={-0.3}
      />
      <testpoint
        name="TP_LOAD"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={11}
        pcbY={0.3}
      />
      <testpoint
        name="TN_LOAD"
        footprintVariant="pad"
        padDiameter="0.3mm"
        doNotPlace
        pcbX={11}
        pcbY={-0.3}
      />
      <trace
        name="DP"
        from=".TP_SRC > .pin1"
        to=".TP_LOAD > .pin1"
        thickness="0.25mm"
        pcbPath={[
          { x: 2, y: 0 },
          { x: 2, y: 0.5 },
          { x: 2.5, y: 0.5 },
          { x: 2.5, y: 0 },
        ]}
      />
      <trace
        name="DN"
        from=".TN_SRC > .pin1"
        to=".TN_LOAD > .pin1"
        thickness="0.25mm"
        pcbPath={[
          { x: 7.5, y: 0 },
          { x: 7.5, y: -1.75 },
          { x: 8.5, y: -1.75 },
          { x: 8.5, y: 0 },
          { x: 13.5, y: 0 },
          { x: 13.5, y: -1.25 },
          { x: 14.5, y: -1.25 },
          { x: 14.5, y: 0 },
        ]}
      />
      <differentialpair
        name="PAIR"
        positiveConnection="DP"
        negativeConnection="DN"
        pcbTraceGap="0.35mm"
      />
    </board>
  )
}

/** Renders {@link AsymmetricSkewBoard} through core. */
export function renderAsymmetricSkewBoard(): CircuitJson {
  const circuit = new Circuit()
  circuit.add(<AsymmetricSkewBoard />)
  return circuit.getCircuitJson()
}
