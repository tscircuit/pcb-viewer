import type { ReactElement } from "react"
import { renderDifferentialPairBoard } from "../../../../tests/fixtures/local-skew/differential-pair-board"
import { PCBViewer } from "../../../PCBViewer"

/** Rendered once, so the viewer doesn't get a new board on every render. */
const circuitJson = renderDifferentialPairBoard({ compensated: true })

/**
 * The two traces have the same total length, so the end-to-end skew check
 * passes. USB_DP is still about 1.24 mm longer between its detour near the
 * source and USB_DN's detour near the load.
 */
export default function LocalSkewDifferentialPair(): ReactElement {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer renderer="canvas" height={600} circuitJson={circuitJson} />
    </div>
  )
}
