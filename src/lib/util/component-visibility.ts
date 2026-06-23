import type { AnyCircuitElement } from "circuit-json"

export type ComponentKind = "through_hole" | "smt_top" | "smt_bottom"

// Classify each pcb_component as either through_hole (has at least one
// pcb_plated_hole) or smt on its declared layer. Through-hole components
// stay visible regardless of the top/bottom toggles.
export const classifyPcbComponents = (
  elements: AnyCircuitElement[],
): Map<string, ComponentKind> => {
  const kindById = new Map<string, ComponentKind>()
  const platedHoleComponentIds = new Set<string>()

  for (const el of elements) {
    if (el.type !== "pcb_plated_hole") continue
    const id = (el as any).pcb_component_id as string | undefined
    if (id) platedHoleComponentIds.add(id)
  }

  for (const el of elements) {
    if (el.type !== "pcb_component") continue
    const id = (el as any).pcb_component_id as string
    if (platedHoleComponentIds.has(id)) {
      kindById.set(id, "through_hole")
      continue
    }
    const layer = (el as any).layer
    kindById.set(id, layer === "bottom" ? "smt_bottom" : "smt_top")
  }

  return kindById
}

// Returns the set of pcb_component_ids that should NOT be drawn given
// the top/bottom toggle state. Through-hole components are always kept
// visible (they exist on both sides).
export const getHiddenPcbComponentIds = (
  elements: AnyCircuitElement[],
  isShowingTopComponents: boolean,
  isShowingBottomComponents: boolean,
): Set<string> => {
  const hidden = new Set<string>()
  if (isShowingTopComponents && isShowingBottomComponents) return hidden

  const kindById = classifyPcbComponents(elements)
  for (const [id, kind] of kindById) {
    if (kind === "smt_top" && !isShowingTopComponents) hidden.add(id)
    if (kind === "smt_bottom" && !isShowingBottomComponents) hidden.add(id)
  }
  return hidden
}

// Returns a filtered view of `elements` with everything tied to a hidden
// pcb_component_id removed. Elements without a `pcb_component_id` (board
// outline, edge cuts, vias, traces, copper pours, ...) are passed
// through unchanged.
export const filterElementsByVisibility = (
  elements: AnyCircuitElement[],
  hiddenPcbComponentIds: Set<string>,
): AnyCircuitElement[] => {
  if (hiddenPcbComponentIds.size === 0) return elements
  return elements.filter((el) => {
    const id = (el as any).pcb_component_id as string | undefined
    if (!id) return true
    return !hiddenPcbComponentIds.has(id)
  })
}
