import { PCBViewer } from "../../../PCBViewer"
import { renderDifferentialPairBoard } from "../../../../tests/fixtures/local-skew/differential-pair-board"

/**
 * The two traces have the same total length, so the end-to-end skew check
 * passes. The positive trace is still about 1.24 mm ahead between its
 * detour near the source and the negative trace's detour near the load.
 */
export default function LocalSkewDifferentialPair() {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        renderer="canvas"
        height={600}
        circuitJson={renderDifferentialPairBoard()}
      />
    </div>
  )
}
