import type { ReactElement } from "react"
import {
  PadTapersBoard,
  renderBoard,
} from "../../../../tests/fixtures/phase-skew/example-boards"
import { PhaseSkewViewer } from "./phase-skew-viewer"

const circuitJson = renderBoard(<PadTapersBoard />)

/** The overlay widens with the teardrop tapers as the traces approach the pads. */
export default function PadTapers(): ReactElement {
  return <PhaseSkewViewer circuitJson={circuitJson} />
}
