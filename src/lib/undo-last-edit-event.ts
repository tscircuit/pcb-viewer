import type { ManualEditEvent } from "@tscircuit/props"

/** Drop the most recent completed edit. In-progress drags are left alone. */
export const undoLastEditEvent = (
  editEvents: ManualEditEvent[],
): ManualEditEvent[] => {
  let lastCompletedIndex = -1
  for (let i = editEvents.length - 1; i >= 0; i--) {
    if (!editEvents[i].in_progress) {
      lastCompletedIndex = i
      break
    }
  }
  if (lastCompletedIndex < 0) return editEvents
  return [
    ...editEvents.slice(0, lastCompletedIndex),
    ...editEvents.slice(lastCompletedIndex + 1),
  ]
}
