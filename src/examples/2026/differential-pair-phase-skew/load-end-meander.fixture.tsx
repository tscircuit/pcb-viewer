import type { ReactElement } from "react"
import {
  LoadEndMeanderBoard,
  renderBoard,
} from "../../../../tests/fixtures/phase-skew/example-boards"
import { PhaseSkewViewer } from "./phase-skew-viewer"

const circuitJson = renderBoard(<LoadEndMeanderBoard />)

/** The traces stay blue and red until the two load-end bumps bring them back to white. */
export default function LoadEndMeander(): ReactElement {
  return <PhaseSkewViewer circuitJson={circuitJson} />
}
