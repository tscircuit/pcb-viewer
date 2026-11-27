import { Fragment } from "react"

const legs = [
  {
    name: "P",
    y: 0.6,
    pcbPath: [
      { x: 2, y: 0 },
      { x: 4.2, y: 2.2 },
      { x: 5, y: 2.2 },
      { x: 7.2, y: 0 },
    ],
  },
  { name: "N", y: -0.6, pcbPath: [] },
]

// The generating core can skip autorouting after applying the explicit paths.
const boardProps = { width: 28, height: 9, routeRemaining: false }

// Adapted from the WebGPU renderer's tuning-bump fixture.
export default function TuningBumpBoard() {
  return (
    <board {...boardProps}>
      {legs.map(({ name, y, pcbPath }) => (
        <Fragment key={name}>
          <testpoint
            name={`${name}_SRC`}
            footprintVariant="pad"
            padDiameter={0.65}
            doNotPlace
            pcbX={-12}
            pcbY={y}
          />
          <testpoint
            name={`${name}_LOAD`}
            footprintVariant="pad"
            padDiameter={0.65}
            doNotPlace
            pcbX={12}
            pcbY={y}
          />
          <trace
            name={name}
            from={`.${name}_SRC > .pin1`}
            to={`.${name}_LOAD > .pin1`}
            thickness={0.24}
            pcbPath={pcbPath}
          />
        </Fragment>
      ))}
      <differentialpair
        name="PAIR"
        positiveConnection="P"
        negativeConnection="N"
        pcbTraceGap={0.96}
      />
    </board>
  )
}
