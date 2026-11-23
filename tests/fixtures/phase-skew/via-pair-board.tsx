import { Circuit } from "@tscircuit/core"
import type { CircuitJson, Point } from "circuit-json"
import type { ReactElement } from "react"

/** Board x of the via on each trace, where both drop to the bottom layer. */
export const VIA_X_MM = 0

/**
 * The positive trace's route, relative to its source pad at x = -12: a
 * detour near the source, then a via to the bottom layer at {@link VIA_X_MM}.
 */
const POSITIVE_PATH = [
  { x: 2, y: 0 },
  { x: 2.5, y: 1 },
  { x: 3, y: 0 },
  { x: 12, y: 0, via: true, toLayer: "bottom" },
] satisfies (Point & { via?: boolean; toLayer?: "bottom" })[]

/** The negative trace's route: straight to its via, below the positive one. */
const NEGATIVE_PATH = [
  { x: 12, y: 0, via: true, toLayer: "bottom" },
] satisfies (Point & { via?: boolean; toLayer?: "bottom" })[]

/**
 * A differential pair whose traces both change from top to bottom copper
 * through a via at the same x, with the positive trace ahead after its detour.
 */
export function ViaPairBoard(): ReactElement {
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
        layer="bottom"
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
        layer="bottom"
      />
      <trace
        name="DP"
        from=".TP_P_SRC > .pin1"
        to=".TP_P_DST > .pin1"
        thickness="0.15mm"
        pcbPath={POSITIVE_PATH}
      />
      <trace
        name="DN"
        from=".TP_N_SRC > .pin1"
        to=".TP_N_DST > .pin1"
        thickness="0.15mm"
        pcbPath={NEGATIVE_PATH}
      />
      <differentialpair
        name="VIA_PAIR"
        positiveConnection="DP"
        negativeConnection="DN"
        pcbTraceGap="0.45mm"
      />
    </board>
  )
}

/** Renders {@link ViaPairBoard} through core. */
export function renderViaPairBoard(): CircuitJson {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(<ViaPairBoard />)
  circuit.render()
  return circuit.getCircuitJson() as CircuitJson
}

/**
 * {@link ViaPairBoard} without its `pcb_via` records, so each via exists only
 * as a route point of its trace, as some autorouters store them.
 */
export function renderRouteOnlyViaPairBoard(): CircuitJson {
  const elements = renderViaPairBoard().filter(
    (element) => element.type !== "pcb_via",
  )
  for (const element of elements) {
    if (element.type !== "pcb_board") continue
    // With neither route-point dimensions nor board minima, Canvas uses its defaults.
    delete element.min_via_hole_diameter
    delete element.min_via_pad_diameter
  }
  return elements
}
