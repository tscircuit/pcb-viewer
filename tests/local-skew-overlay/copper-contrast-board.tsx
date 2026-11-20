import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"
import type { ReactElement } from "react"
import { DETOUR_EXTRA_LENGTH } from "../fixtures/local-skew/differential-pair-board"

const POSITIVE_DETOUR_HEIGHT = 1
const NEGATIVE_DETOUR_DEPTH = DETOUR_EXTRA_LENGTH / 2

/**
 * A compensated top-layer differential pair (USB_DN renders pure red at
 * (0, -0.3)) alongside an ordinary 0.5 mm top copper trace at y = -2 so a
 * test can compare red-overlay and plain-copper pixels side by side.
 */
export function CopperContrastBoard(): ReactElement {
  return (
    <board width="30mm" height="10mm">
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
      <testpoint
        name="PLAIN_L"
        footprintVariant="pad"
        padDiameter="0.5mm"
        doNotPlace
        pcbX={-6}
        pcbY={-2.5}
      />
      <testpoint
        name="PLAIN_R"
        footprintVariant="pad"
        padDiameter="0.5mm"
        doNotPlace
        pcbX={6}
        pcbY={-2.5}
      />
      <trace
        name="PLAIN"
        from=".PLAIN_L > .pin1"
        to=".PLAIN_R > .pin1"
        thickness="0.5mm"
        pcbPath={[]}
      />
    </board>
  )
}

/** Renders {@link CopperContrastBoard} through core. */
export function renderCopperContrastBoard(): CircuitJson {
  const circuit = new Circuit()
  circuit.add(<CopperContrastBoard />)
  return circuit.getCircuitJson()
}
