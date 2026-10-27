import { createRoot } from "react-dom/client"
import ReturnCurrentSimulationDemo from "../../src/examples/2026/return-current.fixture"

const Demo = new URLSearchParams(window.location.search).has("four_layer")
  ? (await import("../../src/examples/2026/return-current-four-layer.fixture"))
      .default
  : ReturnCurrentSimulationDemo
createRoot(document.getElementById("root")!).render(<Demo />)
