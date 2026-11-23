import type { ReactElement } from "react"
import {
  FourLanesBoard,
  renderBoard,
} from "../../../../tests/fixtures/phase-skew/example-boards"
import { PhaseSkewViewer } from "./phase-skew-viewer"

const circuitJson = renderBoard(<FourLanesBoard />)

/** From top to bottom, see a matched lane, each skew polarity, and a lane whose skew changes sign. */
export default function FourLanes(): ReactElement {
  return <PhaseSkewViewer circuitJson={circuitJson} />
}
