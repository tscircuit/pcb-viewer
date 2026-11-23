import { Circuit } from "@tscircuit/core"
import type { PcbPath } from "@tscircuit/props"
import type { CircuitJson } from "circuit-json"
import { Fragment, type ComponentProps, type ReactElement } from "react"
import { PCBViewer } from "../../../PCBViewer"

export function Pair({
  name,
  y = 0,
  positivePath = [],
  negativePath = [],
  loadLayer = "top",
  padDiameter = 0.65,
  teardrops = false,
}: {
  name: string
  y?: number
  positivePath?: PcbPath
  negativePath?: PcbPath
  loadLayer?: "top" | "bottom"
  padDiameter?: number
  teardrops?: boolean
}): ReactElement {
  const legs = [
    { name: `${name}_P`, y: y + 0.6, path: positivePath },
    { name: `${name}_N`, y: y - 0.6, path: negativePath },
  ]
  return (
    <>
      {legs.map(({ name, y, path }) => (
        <Fragment key={name}>
          <testpoint
            name={`${name}_SRC`}
            footprintVariant="pad"
            padDiameter={padDiameter}
            doNotPlace
            pcbX={-12}
            pcbY={y}
          />
          <testpoint
            name={`${name}_LOAD`}
            footprintVariant="pad"
            padDiameter={padDiameter}
            doNotPlace
            pcbX={12}
            pcbY={y}
            layer={loadLayer}
          />
          <trace
            name={name}
            from={`.${name}_SRC > .pin1`}
            to={`.${name}_LOAD > .pin1`}
            thickness="0.24mm"
            pcbPath={path}
            pcbTeardrops={teardrops}
          />
        </Fragment>
      ))}
      <differentialpair
        name={name}
        positiveConnection={`${name}_P`}
        negativeConnection={`${name}_N`}
        pcbTraceGap="0.96mm"
      />
    </>
  )
}

/** A 45° detour measured from the source pad, with its height signed by direction. */
export function detour(x: number, height: number): PcbPath {
  const run = Math.abs(height)
  return [
    { x, y: 0 },
    { x: x + run, y: height },
    { x: x + run + 0.8, y: height },
    { x: x + 2 * run + 0.8, y: 0 },
  ]
}

export function renderBoard(board: ReactElement): CircuitJson {
  const circuit = new Circuit({ platform: { drcChecksDisabled: true } })
  circuit.add(board)
  return circuit.getCircuitJson() as CircuitJson
}

export function PhaseSkewViewer({
  circuitJson,
  renderer = "canvas",
  phaseSkewColors,
}: Pick<
  ComponentProps<typeof PCBViewer>,
  "circuitJson" | "renderer" | "phaseSkewColors"
>): ReactElement {
  return (
    <PCBViewer
      circuitJson={circuitJson}
      renderer={renderer}
      phaseSkewColors={phaseSkewColors}
      height={480}
      initialState={{ is_showing_differential_pair_phase_skew: true }}
    />
  )
}
