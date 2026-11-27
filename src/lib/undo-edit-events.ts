import type { ManualEditEvent } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"

export interface CompletedComponentMove {
  edit_event_id: string
  pcb_component_id: string
  from_center: { x: number; y: number }
  to_center: { x: number; y: number }
}

const POSITION_EPSILON = 1e-9

export function isEditableDomElement(node: unknown): boolean {
  if (!node || typeof node !== "object") return false
  const candidate = node as {
    tagName?: unknown
    isContentEditable?: unknown
  }
  if (typeof candidate.tagName !== "string") return false
  const tagName = candidate.tagName.toUpperCase()
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    Boolean(candidate.isContentEditable)
  )
}

export function shouldHandleViewerUndoKeyDown({
  event,
  allowEditing,
  isMovingComponent,
  viewerRoot,
  activeElement,
}: {
  event: {
    key: string
    ctrlKey: boolean
    metaKey: boolean
    shiftKey: boolean
    altKey: boolean
    target?: unknown
  }
  allowEditing: boolean
  isMovingComponent: boolean
  viewerRoot: { contains: (other: any) => boolean } | null | undefined
  activeElement: unknown
}): boolean {
  const isUndoShortcut =
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "z"
  if (!isUndoShortcut) return false
  if (!allowEditing || isMovingComponent) return false
  if (
    isEditableDomElement(event.target as any) ||
    isEditableDomElement(activeElement as any)
  ) {
    return false
  }
  if (!viewerRoot || !activeElement) return false
  return viewerRoot === activeElement || viewerRoot.contains(activeElement)
}

export function hasMovementDelta(
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  return (
    Math.abs(a.x - b.x) > POSITION_EPSILON ||
    Math.abs(a.y - b.y) > POSITION_EPSILON
  )
}

export function isNoOpComponentMove(event: ManualEditEvent): boolean {
  return (
    event.edit_event_type === "edit_pcb_component_location" &&
    !event.in_progress &&
    !hasMovementDelta(event.original_center, event.new_center)
  )
}

/**
 * Removes the most recent completed edit event while leaving any in-progress
 * drag event intact and stripping trailing zero-delta clicks.
 */
export function undoLastEditEvent(
  editEvents: ManualEditEvent[],
  ignoredEventIds?: ReadonlySet<string>,
): ManualEditEvent[] {
  if (editEvents.length === 0) return editEvents

  let targetIndex = -1
  for (let i = editEvents.length - 1; i >= 0; i--) {
    const event = editEvents[i]
    if (!event || event.in_progress) continue
    if (ignoredEventIds?.has(event.edit_event_id)) continue
    if (isNoOpComponentMove(event)) continue
    targetIndex = i
    break
  }

  if (targetIndex < 0) return editEvents

  return editEvents.filter((event, index) => {
    if (index === targetIndex) return false
    if (index > targetIndex && isNoOpComponentMove(event)) return false
    return true
  })
}

export function canUndoEditEvents({
  editEvents,
  completedMoves,
  undoGeneratedEventIds,
}: {
  editEvents: ManualEditEvent[]
  completedMoves: CompletedComponentMove[]
  undoGeneratedEventIds?: ReadonlySet<string>
}): boolean {
  if (completedMoves.length > 0) return true
  return editEvents.some(
    (event) =>
      !event.in_progress &&
      !undoGeneratedEventIds?.has(event.edit_event_id) &&
      !isNoOpComponentMove(event),
  )
}

export function resolveUndoEditEvents({
  editEvents,
  completedMoves,
  circuitJson,
  undoGeneratedEventIds,
  createEventId,
}: {
  editEvents: ManualEditEvent[]
  completedMoves: CompletedComponentMove[]
  circuitJson?: AnyCircuitElement[]
  undoGeneratedEventIds?: ReadonlySet<string>
  createEventId?: (sourceEventId: string) => string
}): {
  didUndo: boolean
  nextEditEvents: ManualEditEvent[]
  nextCompletedMoves: CompletedComponentMove[]
  generatedUndoEventId?: string
} {
  if (completedMoves.length > 0) {
    const lastMove = completedMoves[completedMoves.length - 1]!
    const nextCompletedMoves = completedMoves.slice(0, -1)
    const existingIndex = editEvents.findIndex(
      (event) =>
        event.edit_event_id === lastMove.edit_event_id && !event.in_progress,
    )

    if (existingIndex >= 0) {
      const nextEditEvents = editEvents.filter((event, index) => {
        if (index === existingIndex) return false
        if (index > existingIndex && isNoOpComponentMove(event)) return false
        return true
      })
      return {
        didUndo: true,
        nextEditEvents,
        nextCompletedMoves,
      }
    }

    const pcbComponent = circuitJson?.find(
      (
        element,
      ): element is Extract<AnyCircuitElement, { type: "pcb_component" }> =>
        element.type === "pcb_component" &&
        element.pcb_component_id === lastMove.pcb_component_id,
    )
    const currentCenter = pcbComponent?.center ?? lastMove.to_center
    const generatedUndoEventId = createEventId
      ? createEventId(lastMove.edit_event_id)
      : `undo_${lastMove.edit_event_id}_${Date.now()}`

    const revertEvent: ManualEditEvent = {
      edit_event_id: generatedUndoEventId,
      edit_event_type: "edit_pcb_component_location",
      pcb_edit_event_type: "edit_component_location",
      pcb_component_id: lastMove.pcb_component_id,
      original_center: { x: currentCenter.x, y: currentCenter.y },
      new_center: { x: lastMove.from_center.x, y: lastMove.from_center.y },
      in_progress: false,
      created_at: Date.now(),
    }

    const filteredEvents = editEvents.filter((event) => {
      if (isNoOpComponentMove(event)) return false
      if (
        undoGeneratedEventIds?.has(event.edit_event_id) &&
        event.edit_event_type === "edit_pcb_component_location" &&
        event.pcb_component_id === lastMove.pcb_component_id
      ) {
        return false
      }
      return true
    })

    return {
      didUndo: true,
      nextEditEvents: [...filteredEvents, revertEvent],
      nextCompletedMoves,
      generatedUndoEventId,
    }
  }

  const nextEditEvents = undoLastEditEvent(editEvents, undoGeneratedEventIds)
  if (nextEditEvents !== editEvents) {
    return {
      didUndo: true,
      nextEditEvents,
      nextCompletedMoves: completedMoves,
    }
  }

  return {
    didUndo: false,
    nextEditEvents: editEvents,
    nextCompletedMoves: completedMoves,
  }
}
