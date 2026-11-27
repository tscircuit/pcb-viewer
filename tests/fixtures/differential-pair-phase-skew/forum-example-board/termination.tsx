import { Fragment, type ReactElement } from "react"
import { applyToPoint } from "transformation-matrix"
import {
  PAD_PITCH_MM,
  PIXELS_PER_MM,
  POSITIVE_PAD_Y,
  imageToPcb,
} from "./constants"

export function Termination({
  name,
  x,
}: { name: string; x: number }): ReactElement {
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
