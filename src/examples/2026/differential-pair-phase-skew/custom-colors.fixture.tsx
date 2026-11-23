import type { ReactElement } from "react"
import {
  CustomColorsBoard,
  phaseSkewColors,
  renderBoard,
} from "../../../../tests/fixtures/phase-skew/example-boards"
import { PhaseSkewViewer } from "./phase-skew-viewer"

const circuitJson = renderBoard(<CustomColorsBoard />)

/** Cream marks matched sections, teal marks the longer trace, and orange marks the shorter trace. */
export default function CustomColors(): ReactElement {
  return (
    <PhaseSkewViewer
      circuitJson={circuitJson}
      phaseSkewColors={phaseSkewColors}
    />
  )
}
