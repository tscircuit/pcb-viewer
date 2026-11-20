import type { ReactElement } from "react"
import { renderDifferentialPairBoard } from "../../../../tests/fixtures/local-skew/differential-pair-board"
import { PCBViewer } from "../../../PCBViewer"

/** Rendered once, so the viewer doesn't get a new board on every render. */
const circuitJson = renderDifferentialPairBoard({ compensated: true })

const skew = circuitJson.find(
  (element) => element.type === "pcb_differential_pair_local_skew",
)

export default function LocalSkewDifferentialPair(): ReactElement {
  return (
    <div style={{ backgroundColor: "black", color: "#ddd" }}>
      <p style={{ margin: 0, padding: 8, font: "13px sans-serif" }}>
        USB_DP and USB_DN match end to end. Circuit JSON records{" "}
        {skew?.max_local_skew?.toFixed(3)} mm of local skew between the detours.
      </p>
      <PCBViewer height={600} circuitJson={circuitJson} />
    </div>
  )
}
