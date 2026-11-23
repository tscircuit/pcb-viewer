import type { ReactElement } from "react"
import {
  LayerChangeBoard,
  renderBoard,
} from "../../../../tests/fixtures/phase-skew/example-boards"
import { PhaseSkewViewer } from "./phase-skew-viewer"

const circuitJson = renderBoard(<LayerChangeBoard />)

/** Skew starts on top copper, runs through the vias, and returns to white after the bottom-layer detour. */
export default function LayerChange(): ReactElement {
  return <PhaseSkewViewer circuitJson={circuitJson} />
}
