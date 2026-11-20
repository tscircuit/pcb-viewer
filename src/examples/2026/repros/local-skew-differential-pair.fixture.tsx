import type { PcbTrace } from "circuit-json"
import type { ReactElement } from "react"
import {
  DETOUR_EXTRA_LENGTH,
  renderDifferentialPairBoard,
} from "../../../../tests/fixtures/local-skew/differential-pair-board"
import { PCBViewer } from "../../../PCBViewer"

/** Rendered once, so the viewer doesn't get a new board on every render. */
const circuitJson = renderDifferentialPairBoard({ compensated: true })

const totalLength = circuitJson.find(
  (element): element is PcbTrace => element.type === "pcb_trace",
)?.trace_length

/**
 * Both traces have the same total length, so `checkPcbBusLengthSkew`
 * reports nothing for this pair (this render doesn't run DRC, so the
 * viewer's error list is empty regardless). USB_DP is still about 1.24 mm
 * longer between its detour near the source and USB_DN's detour near the
 * load.
 */
export default function LocalSkewDifferentialPair(): ReactElement {
  return (
    <div style={{ backgroundColor: "black", color: "#ddd" }}>
      <p style={{ margin: 0, padding: 8, font: "13px sans-serif" }}>
        USB_DP and USB_DN both total {totalLength?.toFixed(3)} mm, within the
        0.1 mm end-to-end skew limit, but between the two detours USB_DP is{" "}
        {DETOUR_EXTRA_LENGTH.toFixed(3)} mm longer.
      </p>
      <PCBViewer renderer="canvas" height={600} circuitJson={circuitJson} />
    </div>
  )
}
