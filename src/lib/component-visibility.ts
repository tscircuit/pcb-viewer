import type { AnyCircuitElement, PcbComponent } from "circuit-json"

export interface ComponentVisibility {
  showTopComponents: boolean
  showBottomComponents: boolean
}

const componentLayerById = (
  elements: AnyCircuitElement[],
): Map<string, string | undefined> => {
  const layers = new Map<string, string | undefined>()
  for (const element of elements) {
    if (element.type === "pcb_component") {
      layers.set(element.pcb_component_id, element.layer)
    }
  }
  return layers
}

/**
 * Whether a component may be grabbed by the Move Components picker.
 * - Components without a layer (through-hole style) are always pickable.
 * - Otherwise the component must sit on the selected copper layer AND its
 *   side must not be hidden via the View menu toggles.
 */
export const isComponentPickable = (
  component: Pick<PcbComponent, "layer"> & { layer?: string },
  selectedLayer: string,
  visibility: ComponentVisibility,
): boolean => {
  if (component.layer === "top") {
    return selectedLayer === "top" && visibility.showTopComponents
  }
  if (component.layer === "bottom") {
    return selectedLayer === "bottom" && visibility.showBottomComponents
  }
  return true
}

/**
 * Drops the visuals belonging to hidden-side components (pads, courtyards,
 * silkscreen linked via pcb_component_id). Component entries themselves are
 * kept (they render nothing but the picker reads them); elements without a
 * component link are untouched.
 */
export const filterHiddenComponentElements = (
  elements: AnyCircuitElement[],
  visibility: ComponentVisibility,
): AnyCircuitElement[] => {
  if (visibility.showTopComponents && visibility.showBottomComponents) {
    return elements
  }
  const layers = componentLayerById(elements)
  return elements.filter((element) => {
    if (element.type === "pcb_component") return true
    const componentId = (element as { pcb_component_id?: unknown })
      .pcb_component_id
    if (typeof componentId !== "string") return true
    const layer = layers.get(componentId)
    if (layer === "top") return visibility.showTopComponents
    if (layer === "bottom") return visibility.showBottomComponents
    return true
  })
}
