import { useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../src/index"
import {
  createViewportCircuitJson,
  type ViewportScenario,
} from "./create-viewport-circuit-json"
import { getPaintedBoardBounds } from "./get-painted-board-bounds"

const viewportTest = { renderCount: 0, getPaintedBoardBounds }
declare global {
  interface Window {
    pcbViewportTest: typeof viewportTest
  }
}
window.pcbViewportTest = viewportTest

const requestedScenario = new URLSearchParams(location.search).get("scenario")
const scenario: ViewportScenario =
  requestedScenario === "panel" || requestedScenario === "multiple_boards"
    ? requestedScenario
    : "sitara"

function ViewportFramingHarness() {
  const [panelWidth, setPanelWidth] = useState(80)
  const [secondBoardX, setSecondBoardX] = useState(30)
  const [componentX, setComponentX] = useState(0)
  const circuitJson = useMemo(
    () =>
      createViewportCircuitJson({
        scenario,
        panelWidth,
        secondBoardX,
        componentX,
      }),
    [panelWidth, secondBoardX, componentX],
  )
  return (
    <>
      <button type="button" onClick={() => setPanelWidth(200)}>
        Grow panel
      </button>
      <button type="button" onClick={() => setSecondBoardX(150)}>
        Move second board
      </button>
      <button type="button" onClick={() => setComponentX(3)}>
        Move component
      </button>
      <div style={{ height: 600 }}>
        <PCBViewer
          circuitJson={circuitJson}
          height={600}
          renderer="canvas"
          onRenderComplete={() => viewportTest.renderCount++}
        />
      </div>
    </>
  )
}

createRoot(document.getElementById("root")!).render(<ViewportFramingHarness />)
