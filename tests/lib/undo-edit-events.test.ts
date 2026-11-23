import { expect, test } from "bun:test"
import type { ManualEditEvent } from "@tscircuit/props"
import type { CircuitJson } from "circuit-json"
import {
  applyEditEvents,
  undoLastEditEvent,
} from "../../src/lib/apply-edit-events"
import {
  type CompletedComponentMove,
  canUndoEditEvents,
  resolveUndoEditEvents,
  shouldHandleViewerUndoKeyDown,
} from "../../src/lib/undo-edit-events"

const createComponentMoveEvent = ({
  id,
  componentId = "pcb_component_0",
  from = { x: 0, y: 0 },
  to = { x: 4, y: 5 },
  inProgress = false,
}: {
  id: string
  componentId?: string
  from?: { x: number; y: number }
  to?: { x: number; y: number }
  inProgress?: boolean
}): ManualEditEvent => ({
  edit_event_id: id,
  edit_event_type: "edit_pcb_component_location",
  pcb_edit_event_type: "edit_component_location",
  pcb_component_id: componentId,
  original_center: from,
  new_center: to,
  in_progress: inProgress,
  created_at: 1,
})

test("undoLastEditEvent removes last completed move while preserving in-progress drags and stripping trailing zero-delta clicks", () => {
  const moveA = createComponentMoveEvent({
    id: "a",
    from: { x: 0, y: 0 },
    to: { x: 2, y: 3 },
  })
  const moveB = createComponentMoveEvent({
    id: "b",
    from: { x: 2, y: 3 },
    to: { x: 6, y: 7 },
  })
  const zeroClick = createComponentMoveEvent({
    id: "noop",
    from: { x: 6, y: 7 },
    to: { x: 6, y: 7 },
  })
  const inProgress = createComponentMoveEvent({
    id: "drag",
    from: { x: 6, y: 7 },
    to: { x: 8, y: 9 },
    inProgress: true,
  })

  expect(
    undoLastEditEvent([moveA, moveB, zeroClick]).map((e) => e.edit_event_id),
  ).toEqual(["a"])

  expect(
    undoLastEditEvent([moveA, inProgress]).map((e) => e.edit_event_id),
  ).toEqual(["drag"])

  const onlyInProgress = [inProgress]
  expect(undoLastEditEvent(onlyInProgress)).toBe(onlyInProgress)
  expect(undoLastEditEvent([])).toEqual([])
})

test("resolveUndoEditEvents undoes multi-step drags when external CLI caller flushes editEvents into circuitJson", () => {
  let liveCircuitJson: CircuitJson = [
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      center: { x: 0, y: 0 },
      width: 2,
      height: 1,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
  ]
  let completedMoves: CompletedComponentMove[] = []
  const undoGeneratedIds = new Set<string>()

  // Simulate CLI drag #1: (0,0) -> (4,5), flushed immediately into liveCircuitJson
  completedMoves = [
    ...completedMoves,
    {
      edit_event_id: "drag_1",
      pcb_component_id: "pcb_component_0",
      from_center: { x: 0, y: 0 },
      to_center: { x: 4, y: 5 },
    },
  ]
  liveCircuitJson = applyEditEvents({
    circuitJson: liveCircuitJson,
    editEvents: [
      createComponentMoveEvent({
        id: "drag_1",
        from: { x: 0, y: 0 },
        to: { x: 4, y: 5 },
      }),
    ],
  })

  // Simulate CLI drag #2: (4,5) -> (-3,2), flushed immediately into liveCircuitJson
  completedMoves = [
    ...completedMoves,
    {
      edit_event_id: "drag_2",
      pcb_component_id: "pcb_component_0",
      from_center: { x: 4, y: 5 },
      to_center: { x: -3, y: 2 },
    },
  ]
  liveCircuitJson = applyEditEvents({
    circuitJson: liveCircuitJson,
    editEvents: [
      createComponentMoveEvent({
        id: "drag_2",
        from: { x: 4, y: 5 },
        to: { x: -3, y: 2 },
      }),
    ],
  })
  expect(liveCircuitJson[0]).toMatchObject({ center: { x: -3, y: 2 } })

  // Undo #1 with editEvents=[] (flushed by CLI): emits revert event back to (4,5)
  expect(
    canUndoEditEvents({
      editEvents: [],
      completedMoves,
      undoGeneratedEventIds: undoGeneratedIds,
    }),
  ).toBe(true)

  const undo1 = resolveUndoEditEvents({
    editEvents: [],
    completedMoves,
    circuitJson: liveCircuitJson,
    undoGeneratedEventIds: undoGeneratedIds,
  })
  expect(undo1.didUndo).toBe(true)
  expect(undo1.generatedUndoEventId).toBeDefined()
  undoGeneratedIds.add(undo1.generatedUndoEventId!)
  completedMoves = undo1.nextCompletedMoves
  liveCircuitJson = applyEditEvents({
    circuitJson: liveCircuitJson,
    editEvents: undo1.nextEditEvents,
  })
  expect(liveCircuitJson[0]).toMatchObject({ center: { x: 4, y: 5 } })

  // Undo #2 with editEvents=[] (flushed again by CLI): emits revert event back to (0,0)
  const undo2 = resolveUndoEditEvents({
    editEvents: [],
    completedMoves,
    circuitJson: liveCircuitJson,
    undoGeneratedEventIds: undoGeneratedIds,
  })
  expect(undo2.didUndo).toBe(true)
  undoGeneratedIds.add(undo2.generatedUndoEventId!)
  completedMoves = undo2.nextCompletedMoves
  liveCircuitJson = applyEditEvents({
    circuitJson: liveCircuitJson,
    editEvents: undo2.nextEditEvents,
  })
  expect(liveCircuitJson[0]).toMatchObject({ center: { x: 0, y: 0 } })

  // Undo #3: nothing left to undo (even if undo2's generated event has not been flushed yet)
  expect(
    canUndoEditEvents({
      editEvents: undo2.nextEditEvents,
      completedMoves,
      undoGeneratedEventIds: undoGeneratedIds,
    }),
  ).toBe(false)
  const undo3 = resolveUndoEditEvents({
    editEvents: undo2.nextEditEvents,
    completedMoves,
    circuitJson: liveCircuitJson,
    undoGeneratedEventIds: undoGeneratedIds,
  })
  expect(undo3.didUndo).toBe(false)
})

test("shouldHandleViewerUndoKeyDown enforces viewer focus and ignores side-by-side editors or search inputs", () => {
  const childInsideViewer = { tagName: "DIV" }
  const searchInputInsideViewer = { tagName: "INPUT" }
  const externalTextarea = { tagName: "TEXTAREA" }
  const externalMonacoDiv = { tagName: "DIV" }
  const viewerRoot = {
    tagName: "DIV",
    contains: (other: unknown) =>
      other === viewerRoot ||
      other === childInsideViewer ||
      other === searchInputInsideViewer,
  }

  // Focused viewer handles Ctrl+Z and Cmd+Z (Meta+Z)
  expect(
    shouldHandleViewerUndoKeyDown({
      event: {
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        target: viewerRoot,
      },
      allowEditing: true,
      isMovingComponent: false,
      viewerRoot,
      activeElement: viewerRoot,
    }),
  ).toBe(true)

  expect(
    shouldHandleViewerUndoKeyDown({
      event: {
        key: "Z",
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
        altKey: false,
        target: childInsideViewer,
      },
      allowEditing: true,
      isMovingComponent: false,
      viewerRoot,
      activeElement: childInsideViewer,
    }),
  ).toBe(true)

  // Redo (Ctrl+Shift+Z), active drag, or disabled editing are ignored
  expect(
    shouldHandleViewerUndoKeyDown({
      event: {
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
        altKey: false,
        target: viewerRoot,
      },
      allowEditing: true,
      isMovingComponent: false,
      viewerRoot,
      activeElement: viewerRoot,
    }),
  ).toBe(false)

  expect(
    shouldHandleViewerUndoKeyDown({
      event: {
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        target: viewerRoot,
      },
      allowEditing: true,
      isMovingComponent: true,
      viewerRoot,
      activeElement: viewerRoot,
    }),
  ).toBe(false)

  // Side-by-side editor focus (both textarea and custom div) or search input inside viewer are ignored
  expect(
    shouldHandleViewerUndoKeyDown({
      event: {
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        target: externalTextarea,
      },
      allowEditing: true,
      isMovingComponent: false,
      viewerRoot,
      activeElement: externalTextarea,
    }),
  ).toBe(false)

  expect(
    shouldHandleViewerUndoKeyDown({
      event: {
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        target: externalMonacoDiv,
      },
      allowEditing: true,
      isMovingComponent: false,
      viewerRoot,
      activeElement: externalMonacoDiv,
    }),
  ).toBe(false)

  expect(
    shouldHandleViewerUndoKeyDown({
      event: {
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        target: searchInputInsideViewer,
      },
      allowEditing: true,
      isMovingComponent: false,
      viewerRoot,
      activeElement: searchInputInsideViewer,
    }),
  ).toBe(false)
})
