import type { ReactElement } from "react"
import {
  MatchedPairBoard,
  renderBoard,
} from "../../../../tests/fixtures/phase-skew/example-boards"
import { PhaseSkewViewer } from "./phase-skew-viewer"

const circuitJson = renderBoard(<MatchedPairBoard />)

/** Both traces stay white because their lengths match at every point. */
export default function MatchedPair(): ReactElement {
  return <PhaseSkewViewer circuitJson={circuitJson} />
}
