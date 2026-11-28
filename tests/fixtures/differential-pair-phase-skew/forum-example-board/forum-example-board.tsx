import { Fragment, type ReactElement } from "react"
import { LOAD_X, SOURCE_X, TRACE_WIDTH_MM, boardProps } from "./constants"
import { Termination } from "./termination"
import { NEGATIVE_PATH, POSITIVE_PATH } from "./trace-paths"

/**
 * Adapted from circuit-to-canvas #347. Shows the differential pair from
 * JamesJ's KiCad forum phase skew example.
 * https://forum.kicad.info/t/post-v10-new-features-and-development-news/66611/13
 */
export function ForumExampleBoard(): ReactElement {
  return (
    <board
      {...boardProps}
      outline={[
        { x: -11, y: -1 },
        { x: 11, y: -1 },
        { x: 11, y: 5.5 },
        { x: -11, y: 5.5 },
      ]}
    >
      <Termination name="R1" x={SOURCE_X} />
      <Termination name="R2" x={LOAD_X} />
      {[
        { name: "TRACE_P", pin: 1, pcbPath: POSITIVE_PATH },
        { name: "TRACE_N", pin: 2, pcbPath: NEGATIVE_PATH },
      ].map(({ name, pin, pcbPath }) => (
        <Fragment key={name}>
          <trace
            name={name}
            from={`.R1 > .pin${pin}`}
            to={`.R2 > .pin${pin}`}
            thickness={TRACE_WIDTH_MM}
            pcbPath={pcbPath}
          />
        </Fragment>
      ))}
      <differentialpair
        name="TRACE"
        positiveConnection="TRACE_P"
        negativeConnection="TRACE_N"
        pcbTraceGap={0.25}
      />
    </board>
  )
}
