import type { CircuitJson } from "circuit-json"
import type { ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import type { WebGpuResponse } from "../../src/lib/webgpu/protocol"
import type { State, StateProps } from "../../src/global-store"
import { PCBViewer } from "../../src/index"

type SkewProps = Pick<
  ComponentProps<typeof PCBViewer>,
  "localSkewColors" | "localSkewUseLogScale"
>

declare global {
  interface Window {
    /** Rendered from the TSX fixture by the test, which runs core outside the browser. */
    localSkewCircuitJson: CircuitJson
    /** Viewer store fields to start from, set by the test. */
    localSkewInitialState: Partial<State>
    localSkewRenderer: "canvas" | "webgpu"
    lastLocalSkewPick?: Extract<WebGpuResponse, { type: "picked-layer" }>
    updateLocalSkewProps: (props: SkewProps) => void
  }
}

const root = document.getElementById("root")!
const viewer = createRoot(root)
window.updateLocalSkewProps = (props) => {
  viewer.render(
    <PCBViewer
      circuitJson={window.localSkewCircuitJson}
      // `StateProps` only types boolean fields; the store accepts any field.
      initialState={window.localSkewInitialState as Partial<StateProps>}
      renderer={window.localSkewRenderer === "canvas" ? "canvas" : undefined}
      height={400}
      onRenderComplete={() => {
        root.dataset.rendered = "true"
      }}
      {...props}
    />,
  )
}
window.updateLocalSkewProps({})
