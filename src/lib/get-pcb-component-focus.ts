import {
  getPcbElementBounds,
  getPlatedHolePolygon,
  getSmtPadPolygon,
} from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import { applyToPoint, rotateDEG } from "transformation-matrix"
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
  // Generated component sizes are world-space bounds, not unrotated dimensions.
  // Recover the oriented rectangle from the actual copper geometry instead.
  const rotation = component.rotation ?? 0
  const polygons = elements.flatMap((element) => {
    if (
      !("pcb_component_id" in element) ||
      element.pcb_component_id !== pcbComponentId
    )
      return []
    if (element.type === "pcb_smtpad") return [getSmtPadPolygon(element)]
    if (element.type === "pcb_plated_hole")
      return [getPlatedHolePolygon(element, rotation)]
    return []
  })
  const boxes = polygons
    .map((polygon) => polygon.rotate((-rotation * Math.PI) / 180).box)
    .filter((box) =>
      [box.xmin, box.xmax, box.ymin, box.ymax].every(Number.isFinite),
    )
  const fallbackBounds = getPcbElementBounds({ ...component, rotation: 0 })
  if (!fallbackBounds) return
  const localBounds = boxes.length
    ? {
        minX: Math.min(...boxes.map((box) => box.xmin)),
        maxX: Math.max(...boxes.map((box) => box.xmax)),
        minY: Math.min(...boxes.map((box) => box.ymin)),
        maxY: Math.max(...boxes.map((box) => box.ymax)),
      }
    : fallbackBounds
  const outlineRotation = boxes.length ? rotation : 0
  const outline = {
    center: applyToPoint(rotateDEG(outlineRotation), {
      x: (localBounds.minX + localBounds.maxX) / 2,
      y: (localBounds.minY + localBounds.maxY) / 2,
    }),
    width: localBounds.maxX - localBounds.minX,
    height: localBounds.maxY - localBounds.minY,
    rotation: outlineRotation,
  }
  const bounds = boxes.length
    ? {
        minX: Math.min(...polygons.map((polygon) => polygon.box.xmin)),
        maxX: Math.max(...polygons.map((polygon) => polygon.box.xmax)),
        minY: Math.min(...polygons.map((polygon) => polygon.box.ymin)),
        maxY: Math.max(...polygons.map((polygon) => polygon.box.ymax)),
      }
    : fallbackBounds
  return {
    component,
    outline,
    bounds,
    transform: createTransformForBounds({ bounds, width, height }),
  }
}
