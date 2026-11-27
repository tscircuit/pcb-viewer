import type { ManualEditEvent } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../src/index"
import { applyEditEvents } from "../../src/lib/apply-edit-events"

const initialCircuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board_1",
    center: { x: 0, y: 0 },
    width: 20,
    height: 14,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_r1",
    source_component_id: "source_component_r1",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    rotation: 0,
    layer: "top",
    obstructs_within_bounds: true,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_r1_1",
    pcb_component_id: "pcb_component_r1",
    shape: "rect",
    layer: "top",
    x: -1.2,
    y: 0,
    width: 1,
    height: 1.2,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_r1_2",
    pcb_component_id: "pcb_component_r1",
    shape: "rect",
    layer: "top",
    x: 1.2,
    y: 0,
    width: 1,
    height: 1.2,
  },
]

declare global {
  interface Window {
    pcbUndoTest: {
      getComponentCenter: () => { x: number; y: number }
      getEditEventsCount: () => number
      editorUndoKeyCount: number
    }
  }
}

const flushMode =
  new URLSearchParams(location.search).get("mode") === "cli-flush"

function Harness() {
  const [circuitJson, setCircuitJson] =
    useState<AnyCircuitElement[]>(initialCircuitJson)
  const [editEvents, setEditEvents] = useState<ManualEditEvent[]>([])
  const [editorText, setEditorText] = useState("export default () => <board />")

  const effectiveElements = useMemo(
    () =>
      applyEditEvents({
        circuitJson: circuitJson as any,
        editEvents,
      }),
    [circuitJson, editEvents],
  )

  const currentCenter = useMemo(() => {
    const comp = effectiveElements.find(
      (e): e is Extract<AnyCircuitElement, { type: "pcb_component" }> =>
        e.type === "pcb_component" && e.pcb_component_id === "pcb_component_r1",
    )
    return comp?.center ?? { x: 0, y: 0 }
  }, [effectiveElements])

  window.pcbUndoTest = {
    getComponentCenter: () => currentCenter,
    getEditEventsCount: () => editEvents.length,
    editorUndoKeyCount: window.pcbUndoTest?.editorUndoKeyCount ?? 0,
  }

  const handleEditEventsChanged = (nextEvents: ManualEditEvent[]) => {
    if (!flushMode) {
      setEditEvents(nextEvents)
      return
    }
    const completed = nextEvents.filter((e) => !e.in_progress)
    const inProgress = nextEvents.filter((e) => e.in_progress)
    if (completed.length > 0) {
      setCircuitJson((prev) =>
        applyEditEvents({
          circuitJson: prev as any,
          editEvents: completed,
        }),
      )
      setEditEvents(inProgress)
    } else {
      setEditEvents(nextEvents)
    }
  }

  return (
    <div style={{ display: "flex", width: 900, height: 500 }}>
      <div
        data-editor-shell
        tabIndex={-1}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
            window.pcbUndoTest.editorUndoKeyCount += 1
          }
        }}
        style={{ width: 300, height: 500, padding: 8, boxSizing: "border-box" }}
      >
        <textarea
          data-code-editor
          value={editorText}
          onChange={(e) => setEditorText(e.target.value)}
          style={{ width: "100%", height: 200 }}
        />
      </div>
      <div data-viewer-pane style={{ width: 600, height: 500 }}>
        <PCBViewer
          circuitJson={circuitJson}
          renderer="canvas"
          height={500}
          editEvents={editEvents}
          onEditEventsChanged={handleEditEventsChanged}
        />
      </div>
    </div>
  )
}

window.pcbUndoTest = {
  getComponentCenter: () => ({ x: 0, y: 0 }),
  getEditEventsCount: () => 0,
  editorUndoKeyCount: 0,
}

createRoot(document.getElementById("root")!).render(<Harness />)
