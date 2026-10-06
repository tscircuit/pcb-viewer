import { getPcbElementBounds } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import { createTransformForBounds } from "./util/error-preview"

export const getPcbComponentFocus = (
  elements: AnyCircuitElement[],
  pcbComponentId: string,
  width: number,
  height: number,
) => {
  if (width <= 0 || height <= 0) return
  const component = elements.find(
    (element) =>
      element.type === "pcb_component" &&
      element.pcb_component_id === pcbComponentId,
  )
  if (component?.type !== "pcb_component") return
  const bounds = getPcbElementBounds(component)
  if (!bounds) return
  return {
    component,
    bounds,
    transform: createTransformForBounds({ bounds, width, height }),
  }
}
