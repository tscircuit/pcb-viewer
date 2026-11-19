import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

/**
 * Detour height in mm. Both detours add 2 * sqrt(0.5² + 1²) - 1 ≈ 1.236 mm,
 * so the two traces have the same total length.
 */
const POSITIVE_DETOUR_HEIGHT = 1
const NEGATIVE_DETOUR_DEPTH = Math.sqrt(0.5 ** 2 + 1 ** 2) - 0.5

/**
 * A USB-style differential pair whose total lengths match, but whose
 * positive trace is ahead for most of the route. The positive trace
 * detours right after the source, and the negative trace makes up the same
 * length right before the load.
 *
 * Route points are relative to each trace's start port.
 */
export const DifferentialPairBoard = () => (
  <board width="30mm" height="8mm">
    <testpoint
      name="TP_DP_SRC"
      footprintVariant="pad"
      padDiameter="0.3mm"
      doNotPlace
      pcbX={-12}
      pcbY={0.3}
    />
    <testpoint
      name="TP_DN_SRC"
      footprintVariant="pad"
      padDiameter="0.3mm"
      doNotPlace
      pcbX={-12}
      pcbY={-0.3}
    />
    <testpoint
      name="TP_DP_LOAD"
      footprintVariant="pad"
      padDiameter="0.3mm"
      doNotPlace
      pcbX={12}
      pcbY={0.3}
    />
    <testpoint
      name="TP_DN_LOAD"
      footprintVariant="pad"
      padDiameter="0.3mm"
      doNotPlace
      pcbX={12}
      pcbY={-0.3}
    />
    <trace
      name="USB_DP"
      from=".TP_DP_SRC > .pin1"
      to=".TP_DP_LOAD > .pin1"
      thickness="0.15mm"
      pcbPath={[
        { x: 2, y: 0 },
        { x: 2.5, y: POSITIVE_DETOUR_HEIGHT },
        { x: 3, y: 0 },
      ]}
    />
    <trace
      name="USB_DN"
      from=".TP_DN_SRC > .pin1"
      to=".TP_DN_LOAD > .pin1"
      thickness="0.15mm"
      pcbPath={[
        { x: 20, y: 0 },
        { x: 20, y: -NEGATIVE_DETOUR_DEPTH },
        { x: 21, y: -NEGATIVE_DETOUR_DEPTH },
        { x: 21, y: 0 },
      ]}
    />
    <differentialpair
      name="USB"
      positiveConnection="USB_DP"
      negativeConnection="USB_DN"
      pcbTraceGap="0.45mm"
      maxLengthSkew="0.1mm"
    />
  </board>
)

/** Renders {@link DifferentialPairBoard} through core. */
export function renderDifferentialPairBoard(): CircuitJson {
  const circuit = new Circuit()
  circuit.add(<DifferentialPairBoard />)
  return circuit.getCircuitJson() as CircuitJson
}
