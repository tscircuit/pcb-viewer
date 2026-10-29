import type { ManualEditEvent } from "@tscircuit/props"
import { useState } from "react"
import { createRoot } from "react-dom/client"
import { PCBViewer, usePcbViewerController } from "../../src/index"
import { componentCases, createComponentPickingFixture } from "./fixture"

const circuitJson = createComponentPickingFixture()
const renderer =
  new URLSearchParams(window.location.search).get("renderer") === "webgpu"
    ? "webgpu"
    : "canvas"

function Harness() {
  const [edits, setEdits] = useState<ManualEditEvent[]>([])
  const [renderCount, setRenderCount] = useState(0)
  const { controller, focusPcbComponent } = usePcbViewerController()
  return (
    <>
      <div>
        {componentCases.map((component) => (
          <button
            key={component.id}
            onClick={() => focusPcbComponent(component.id)}
          >
            Focus {component.name}
          </button>
        ))}
        <button onClick={() => setEdits([])}>Reset events</button>
      </div>
      <PCBViewer
        renderer={renderer}
        circuitJson={circuitJson}
        height={600}
        focusOnHover
        initialState={{ in_edit_mode: true, in_move_footprint_mode: true }}
        editEvents={edits}
        onEditEventsChanged={setEdits}
        onRenderComplete={() => setRenderCount((count) => count + 1)}
        controller={controller}
      />
      <output
        data-painted={renderCount > 0}
        data-render-count={renderCount}
        data-pending={controller.focusRequest !== null}
      />
      <pre data-edit-events>{JSON.stringify(edits)}</pre>
    </>
  )
}

createRoot(document.getElementById("root")!).render(<Harness />)
