import type { ReactElement } from "react"
import {
  LocalCompensationBoard,
  renderBoard,
} from "../../../../tests/fixtures/phase-skew/example-boards"
import { PhaseSkewViewer } from "./phase-skew-viewer"

const circuitJson = renderBoard(<LocalCompensationBoard />)

/** Skew stays near the source on the compensated upper pair and persists to the load on the lower pair. */
export default function LocalCompensation(): ReactElement {
  return <PhaseSkewViewer circuitJson={circuitJson} />
}
