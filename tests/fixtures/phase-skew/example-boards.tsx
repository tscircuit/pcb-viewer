import { Circuit } from "@tscircuit/core"
import type { PcbPath } from "@tscircuit/props"
import type { CircuitJson } from "circuit-json"
import { Fragment, type ReactElement } from "react"

function Pair({
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
  negativePath?: PcbPath | null
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
            pcbPath={path ?? undefined}
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
function detour(x: number, height: number): PcbPath {
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

export function MatchedPairBoard(): ReactElement {
  return (
    <board width={28} height={8} routeRemaining={false}>
      <Pair name="MATCHED" />
    </board>
  )
}

export function LoadEndMeanderBoard(): ReactElement {
  return (
    <board width={28} height={9} routeRemaining={false}>
      <Pair
        name="MEANDER"
        positivePath={detour(2, 2.2)}
        negativePath={[...detour(16, -1.1), ...detour(20, -1.1)]}
      />
    </board>
  )
}

export function LocalCompensationBoard(): ReactElement {
  return (
    <board width={28} height={11} routeRemaining={false}>
      <Pair
        name="COMPENSATED"
        y={2.2}
        positivePath={detour(3, 0.9)}
        negativePath={detour(6, -0.9)}
      />
      <silkscreentext text="COMPENSATED" pcbX={5} pcbY={3.8} fontSize={0.7} />
      <Pair name="UNCOMPENSATED" y={-2.2} positivePath={detour(3, 0.9)} />
      <silkscreentext
        text="UNCOMPENSATED"
        pcbX={5}
        pcbY={-3.8}
        fontSize={0.7}
      />
    </board>
  )
}

export function FourLanesBoard(): ReactElement {
  return (
    <board width={28} height={18} routeRemaining={false}>
      <Pair name="LANE0" y={6} />
      <Pair name="LANE1" y={2} positivePath={detour(4, 0.8)} />
      <Pair name="LANE2" y={-2} negativePath={detour(10, -1.2)} />
      <Pair
        name="LANE3"
        y={-6}
        positivePath={detour(16, 1.4)}
        negativePath={detour(5, -0.6)}
      />
    </board>
  )
}

export function LayerChangeBoard(): ReactElement {
  const via: PcbPath = [{ x: 12, y: 0, via: true, toLayer: "bottom" }]
  return (
    <board width={28} height={9} routeRemaining={false}>
      <Pair
        name="LAYER_CHANGE"
        loadLayer="bottom"
        positivePath={[...detour(3, 1.1), ...via]}
        negativePath={[...via, ...detour(17, -1.1)]}
      />
    </board>
  )
}

export function PadTapersBoard(): ReactElement {
  return (
    <board width={28} height={8} routeRemaining={false}>
      <Pair
        name="TAPERED"
        positivePath={detour(6, 1.3)}
        padDiameter={1}
        teardrops
      />
    </board>
  )
}

export const phaseSkewColors = {
  negative: "#ff8d32",
  positive: "#29e2bd",
  zero: "#fff1bc",
}

export function CustomColorsBoard(): ReactElement {
  return (
    <board width={28} height={9} routeRemaining={false}>
      <Pair
        name="CUSTOM_COLORS"
        negativePath={detour(5, -1.4)}
        positivePath={detour(15, 2.1)}
      />
    </board>
  )
}

export function RendererComparisonBoard(): ReactElement {
  return (
    <board width={28} height={8} routeRemaining={false}>
      <Pair name="COMPARISON" positivePath={detour(7, 1.3)} />
    </board>
  )
}

export function MitredBendsBoard(): ReactElement {
  // Offset the 45° corners so the pitch stays 1.2 mm along the diagonals.
  const cornerShift = 1.2 * Math.tan(Math.PI / 8)
  return (
    <board width={28} height={12} routeRemaining={false}>
      <Pair
        name="MITRED"
        positivePath={[
          { x: 6, y: 0 },
          { x: 10, y: 4 },
          { x: 14, y: 4 },
          { x: 18, y: 0 },
        ]}
        negativePath={[
          { x: 6 + cornerShift, y: 0 },
          { x: 10 + cornerShift, y: 4 },
          { x: 14 - cornerShift, y: 4 },
          { x: 18 - cornerShift, y: 0 },
        ]}
      />
    </board>
  )
}

export function PartiallyRoutedBoard(): ReactElement {
  return (
    <board width={28} height={12} routeRemaining={false}>
      <Pair name="PARTIALLY_ROUTED" y={2} negativePath={null} />
      <Pair name="MATCHED" y={-2} />
    </board>
  )
}

export function PadShapesBoard(): ReactElement {
  const fanoutSlope = 0.9 / 3.9
  return (
    <board width={28} height={9} routeRemaining={false}>
      {[-12, 12].map((x) => (
        <chip
          key={x}
          name={x < 0 ? "SOURCE" : "LOAD"}
          pcbX={x}
          pcbY={0}
          doNotPlace
          footprint={
            <footprint>
              <smtpad
                shape="pill"
                pcbY={1.5}
                width={3.6}
                height={1.1}
                radius={0.55}
                portHints={["pin1"]}
              />
              <smtpad
                shape="polygon"
                pcbY={-1.5}
                points={[
                  { x: -1.8, y: 0 },
                  { x: -1.2, y: -0.55 },
                  { x: 1.2, y: -0.55 },
                  { x: 1.8, y: 0 },
                  { x: 1.2, y: 0.55 },
                  { x: -1.2, y: 0.55 },
                ]}
                portHints={["pin2"]}
              />
            </footprint>
          }
        />
      ))}
      <trace
        name="P"
        from=".SOURCE > .pin1"
        to=".LOAD > .pin1"
        thickness={0.24}
        pcbPath={[
          { x: 0.5, y: 1.75 },
          { x: 1, y: 1.5 - fanoutSlope },
          { x: 3.9, y: 0.6 },
          { x: 20.1, y: 0.6 },
        ]}
      />
      <trace
        name="N"
        from=".SOURCE > .pin2"
        to=".LOAD > .pin2"
        thickness={0.24}
        pcbPath={[
          { x: 3.9, y: -0.6 },
          { x: 20.1, y: -0.6 },
          { x: 23, y: -1.5 + fanoutSlope },
          { x: 23.5, y: -1.85 },
        ]}
      />
      <differentialpair
        name="SHAPED_PADS"
        positiveConnection="P"
        negativeConnection="N"
        pcbTraceGap={0.96}
      />
    </board>
  )
}
