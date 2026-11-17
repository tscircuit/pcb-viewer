import type { AnyCircuitElement, LayerRef, PcbComponent } from "circuit-json"
import {
  type ComponentSideVisibility,
  getPlatedHoleComponentIds,
} from "./filter-elements-by-component-side-visibility"

/** Select interactive components without changing their geometry or source data. */
export const getPickablePcbComponents = (
  elements: AnyCircuitElement[],
  selectedLayer: LayerRef,
  visibility: ComponentSideVisibility,
): PcbComponent[] => {
  const platedHoleComponentIds = getPlatedHoleComponentIds(elements)
  return elements.filter((element): element is PcbComponent => {
    if (element.type !== "pcb_component") return false
    // A through-hole component still has a top/bottom reference layer.
    // Its owned plated holes, rather than a missing layer, identify it.
    if (platedHoleComponentIds.has(element.pcb_component_id)) return true
    if (element.layer === "top" && !visibility.showTopComponents) return false
    if (element.layer === "bottom" && !visibility.showBottomComponents)
      return false
    // Retain compatibility with older layerless viewer input.
    return !element.layer || element.layer === selectedLayer
  })
}
