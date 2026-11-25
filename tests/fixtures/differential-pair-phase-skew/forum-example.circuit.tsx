import type { Point } from "circuit-json"
import { Fragment, type ReactElement } from "react"
import { applyToPoint, compose, scale, translate } from "transformation-matrix"

const boardProps = { thickness: 1.6, layers: 2, routeRemaining: false } as const

type ImageVertex = [x: number, y: number, radius?: number]

const PIXELS_PER_MM = 47
const IMAGE_CENTER_X = 641
const IMAGE_CENTER_Y = 400
const SOURCE_X = 194.5
const LOAD_X = 1087.5
const POSITIVE_PAD_Y = 306.45
const PAD_PITCH_MM = 1.65
const NEGATIVE_PAD_Y = POSITIVE_PAD_Y + PAD_PITCH_MM * PIXELS_PER_MM

const DIAGONAL = Math.SQRT1_2
const TRACE_WIDTH_MM = 0.2
const BUMP_DEPTH_PX = 47

// The board coordinates use the center of the forum image as the origin
// and reverse its Y axis.
const imagePixelsToMm = scale(1 / PIXELS_PER_MM, -1 / PIXELS_PER_MM)
const imageToPcb = compose(
  imagePixelsToMm,
  translate(-IMAGE_CENTER_X, -IMAGE_CENTER_Y),
)

function tuningBump({
  x,
  y,
  dx,
  dy,
  depth = BUMP_DEPTH_PX,
}: {
  x: number
  y: number
  dx: number
  dy: number
  depth?: number
}): ImageVertex[] {
  const width = 28.2
  const radius = 11.75
  const farX = x + width * dx
  const farY = y + width * dy
  return [
    [x, y, radius],
    [x + depth * dy, y - depth * dx, radius],
    [farX + depth * dy, farY - depth * dx, radius],
    [farX, farY, radius],
  ]
}

// Core's pcbPath is relative to the source component center. Sample each
// round corner into straight pieces, preserving the long straight stretches.
function relativePath({
  sourceCenterY,
  vertices,
}: { sourceCenterY: number; vertices: ImageVertex[] }): Point[] {
  const [startX] = vertices[0]!
  const imageToSource = compose(
    imagePixelsToMm,
    translate(-startX, -sourceCenterY),
  )
  return vertices.slice(1, -1).flatMap(([x, y, radius], index) => {
    if (!radius) return [applyToPoint(imageToSource, { x, y })]

    const [prevX, prevY] = vertices[index]!
    const [nextX, nextY] = vertices[index + 2]!
    const inAngle = Math.atan2(y - prevY, x - prevX)
    const outAngle = Math.atan2(nextY - y, nextX - x)
    const angleDiff = outAngle - inAngle
    const turn = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
    const sign = Math.sign(turn)
    const tangent = radius * Math.tan(Math.abs(turn) / 2)
    const centerX =
      x - tangent * Math.cos(inAngle) - sign * radius * Math.sin(inAngle)
    const centerY =
      y - tangent * Math.sin(inAngle) + sign * radius * Math.cos(inAngle)
    const startAngle = inAngle - (sign * Math.PI) / 2
    const chords = 10

    return Array.from({ length: chords + 1 }, (_, step) => {
      const angle = startAngle + (turn * step) / chords
      return applyToPoint(imageToSource, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      })
    })
  })
}

const FANOUT_CENTER_Y = (POSITIVE_PAD_Y + NEGATIVE_PAD_Y) / 2
const POSITIVE_FANOUT_Y = FANOUT_CENTER_Y - 10.5
const NEGATIVE_FANOUT_Y = FANOUT_CENTER_Y + 10.5
const FANOUT_RUN = POSITIVE_FANOUT_Y - POSITIVE_PAD_Y
const POSITIVE_RISE_X = 363.5
const NEGATIVE_RISE_X = 373.1
const POSITIVE_TOP_Y = 225
const NEGATIVE_TOP_Y = 246
const POSITIVE_FALL_X = 857
const NEGATIVE_FALL_X = 848

const POSITIVE_PATH = relativePath({
  sourceCenterY: FANOUT_CENTER_Y,
  vertices: [
    [SOURCE_X, POSITIVE_PAD_Y],
    [227, POSITIVE_PAD_Y],
    [227 + FANOUT_RUN, POSITIVE_FANOUT_Y],
    [POSITIVE_RISE_X, POSITIVE_FANOUT_Y],
    ...tuningBump({
      x: 423.5,
      y: POSITIVE_FANOUT_Y - (423.5 - POSITIVE_RISE_X),
      dx: DIAGONAL,
      dy: -DIAGONAL,
    }),
    [POSITIVE_RISE_X + POSITIVE_FANOUT_Y - POSITIVE_TOP_Y, POSITIVE_TOP_Y],
    ...tuningBump({ x: 577, y: POSITIVE_TOP_Y, dx: 1, dy: 0 }),
    [POSITIVE_FALL_X, POSITIVE_TOP_Y],
    ...tuningBump({
      x: 909.5,
      y: POSITIVE_TOP_Y + (909.5 - POSITIVE_FALL_X),
      dx: DIAGONAL,
      dy: DIAGONAL,
    }),
    [POSITIVE_FALL_X + POSITIVE_FANOUT_Y - POSITIVE_TOP_Y, POSITIVE_FANOUT_Y],
    [1055 - FANOUT_RUN, POSITIVE_FANOUT_Y],
    [1055, POSITIVE_PAD_Y],
    [LOAD_X, POSITIVE_PAD_Y],
  ],
})

const NEGATIVE_PATH = relativePath({
  sourceCenterY: FANOUT_CENTER_Y,
  vertices: [
    [SOURCE_X, NEGATIVE_PAD_Y],
    [227, NEGATIVE_PAD_Y],
    [227 + FANOUT_RUN, NEGATIVE_FANOUT_Y],
    [NEGATIVE_RISE_X, NEGATIVE_FANOUT_Y],
    [NEGATIVE_RISE_X + NEGATIVE_FANOUT_Y - NEGATIVE_TOP_Y, NEGATIVE_TOP_Y],
    ...[666, 722.4, 778.8].flatMap((x) =>
      tuningBump({ x, y: NEGATIVE_TOP_Y, dx: 1, dy: 0, depth: -BUMP_DEPTH_PX }),
    ),
    [NEGATIVE_FALL_X, NEGATIVE_TOP_Y],
    [NEGATIVE_FALL_X + NEGATIVE_FANOUT_Y - NEGATIVE_TOP_Y, NEGATIVE_FANOUT_Y],
    [1055 - FANOUT_RUN, NEGATIVE_FANOUT_Y],
    [1055, NEGATIVE_PAD_Y],
    [LOAD_X, NEGATIVE_PAD_Y],
  ],
})

function Termination({ name, x }: { name: string; x: number }): ReactElement {
  const at = applyToPoint(imageToPcb, {
    x,
    y: POSITIVE_PAD_Y + (PAD_PITCH_MM * PIXELS_PER_MM) / 2,
  })
  return (
    <chip
      name={name}
      pcbX={at.x}
      pcbY={at.y}
      schX={at.x}
      schY={at.y}
      footprint={
        <footprint>
          {[
            { pin: 1, pcbY: PAD_PITCH_MM / 2 },
            { pin: 2, pcbY: -PAD_PITCH_MM / 2 },
          ].map(({ pin, pcbY }) => (
            <Fragment key={pin}>
              <smtpad
                shape="rect"
                width={0.95}
                height={0.8}
                cornerRadius={0.2}
                pcbX={0}
                pcbY={pcbY}
                portHints={[`pin${pin}`]}
              />
            </Fragment>
          ))}
        </footprint>
      }
    />
  )
}

/**
 * Adapted from circuit-to-canvas #347. Shows the differential pair from
 * JamesJ's KiCad forum phase skew example.
 * https://forum.kicad.info/t/post-v10-new-features-and-development-news/66611/13
 */
export default function ForumExampleBoard(): ReactElement {
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
