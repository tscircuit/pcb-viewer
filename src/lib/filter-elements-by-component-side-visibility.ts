import type { AnyCircuitElement, PcbComponent } from "circuit-json"

export type ComponentSideVisibility = {
  showTopComponents: boolean
  showBottomComponents: boolean
}

const getElementComponentId = (element: AnyCircuitElement) => {
  return "pcb_component_id" in element
    ? (element.pcb_component_id as string | undefined)
    : undefined
}

const isLayerHidden = (
  layer: string | undefined,
  { showTopComponents, showBottomComponents }: ComponentSideVisibility,
) => {
  if (layer === "top") return !showTopComponents
  if (layer === "bottom") return !showBottomComponents
  return false
}

const getElementLayer = (element: AnyCircuitElement) => {
  if ("layer" in element && typeof element.layer === "string") {
    return element.layer
  }

  if ("layers" in element && Array.isArray(element.layers)) {
    if (element.layers.includes("top")) return "top"
    if (element.layers.includes("bottom")) return "bottom"
  }

  return undefined
}

const getComponentLayer = (
  component: AnyCircuitElement,
  elements: AnyCircuitElement[],
) => {
  const componentLayer = getElementLayer(component)
  if (componentLayer) return componentLayer

  const componentId = getElementComponentId(component)
  if (!componentId) return undefined

  const childElement = elements.find(
    (element) =>
      element.type !== "pcb_component" &&
      getElementComponentId(element) === componentId &&
      getElementLayer(element),
  )

  return childElement ? getElementLayer(childElement) : undefined
}

export type PcbComponentId = PcbComponent["pcb_component_id"]

export const getPlatedHoleComponentIds = (
  elements: AnyCircuitElement[],
): Set<PcbComponentId> => {
  const componentIds = new Set<PcbComponentId>()
  for (const element of elements) {
    if (
      element.type === "pcb_plated_hole" &&
      element.pcb_component_id !== undefined
    ) {
      componentIds.add(element.pcb_component_id)
    }
  }
  return componentIds
}

export const filterElementsByComponentSideVisibility = (
  elements: AnyCircuitElement[],
  visibility: ComponentSideVisibility,
) => {
  if (visibility.showTopComponents && visibility.showBottomComponents) {
    return elements
  }

  const hiddenComponentIds = new Set<PcbComponentId>()
  const platedHoleComponentIds = getPlatedHoleComponentIds(elements)

  for (const element of elements) {
    if (element.type !== "pcb_component") continue

    const componentId = getElementComponentId(element)
    if (!componentId) continue
    if (platedHoleComponentIds.has(componentId)) continue

    const layer = getComponentLayer(element, elements)
    if (isLayerHidden(layer, visibility)) {
      hiddenComponentIds.add(componentId)
    }
  }

  if (hiddenComponentIds.size === 0) return elements

  return elements.filter((element) => {
    const componentId = getElementComponentId(element)
    return !componentId || !hiddenComponentIds.has(componentId)
  })
}
