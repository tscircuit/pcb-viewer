import type { LayerRef } from "circuit-json"

interface PickabilityOptions {
  selectedLayer: LayerRef
  showTopComponents?: boolean
  showBottomComponents?: boolean
}

export const shouldPickPcbComponent = (
  component: { layer?: LayerRef | null },
  {
    selectedLayer,
    showTopComponents = true,
    showBottomComponents = true,
  }: PickabilityOptions,
) => {
  if (component.layer !== "top" && component.layer !== "bottom") {
    // Through-hole style components can be interacted with from either side.
    return true
  }

  if (component.layer === "top" && !showTopComponents) return false
  if (component.layer === "bottom" && !showBottomComponents) return false

  return component.layer === selectedLayer
}
