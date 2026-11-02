import { createRoot } from "react-dom/client"
import keepoutExamples from "../../src/examples/2025/keepout.fixture"
import TransformExample from "../../src/examples/2025/tests/transform-on-update.fixture"

localStorage.setItem("pcb_viewer_rendering_engine", "canvas")
const fixture = new URLSearchParams(location.search).get("fixture")
let Example = TransformExample
if (fixture === "keepout_rect") Example = keepoutExamples.KeepoutRectExample
if (fixture === "keepout_circle") Example = keepoutExamples.KeepoutCircleExample
createRoot(document.getElementById("root")!).render(<Example />)
requestAnimationFrame(() => {
  window.exampleArtworkReady = true
})

declare global {
  interface Window {
    exampleArtworkReady: boolean
  }
}
