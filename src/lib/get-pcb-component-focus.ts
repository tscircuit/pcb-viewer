import {
  getPcbElementBounds,
  getPlatedHolePolygon,
  getSmtPadPolygon,
} from "@tscircuit/circuit-json-util"
import {
  type AnyCircuitElement,
  type PcbPlatedHole,
  distance,
} from "circuit-json"
import { applyToPoint, rotateDEG } from "transformation-matrix"
import { createTransformForBounds } from "./util/error-preview"

const isFiniteBox = (box: {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
}) => [box.xmin, box.xmax, box.ymin, box.ymax].every(Number.isFinite)

const normalizePlatedHoleForPolygon = (hole: PcbPlatedHole): PcbPlatedHole => {
  if (hole.shape === "circle" || "outer_width" in hole) {
    return hole
  }

  const holeOffsetX = distance.parse(
    "hole_offset_x" in hole ? (hole.hole_offset_x ?? 0) : 0,
  )
  const holeOffsetY = distance.parse(
    "hole_offset_y" in hole ? (hole.hole_offset_y ?? 0) : 0,
  )
  const rectPadOffsetX = distance.parse(
    "rect_pad_offset_x" in hole
      ? ((hole as { rect_pad_offset_x?: number | string }).rect_pad_offset_x ??
          0)
      : 0,
  )
  const rectPadOffsetY = distance.parse(
    "rect_pad_offset_y" in hole
      ? ((hole as { rect_pad_offset_y?: number | string }).rect_pad_offset_y ??
          0)
      : 0,
  )

  return {
    ...hole,
    x: hole.x + rectPadOffsetX,
    y: hole.y + rectPadOffsetY,
    hole_offset_x: holeOffsetX - rectPadOffsetX,
    hole_offset_y: holeOffsetY - rectPadOffsetY,
  }
}

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
    try {
      if (element.type === "pcb_smtpad") return [getSmtPadPolygon(element)]
      if (element.type === "pcb_plated_hole")
        return [
          getPlatedHolePolygon(
            normalizePlatedHoleForPolygon(element),
            rotation,
          ),
        ]
    } catch {
      return []
    }
    return []
  })
  const validPolygons = polygons.filter((polygon) => isFiniteBox(polygon.box))
  const boxes = validPolygons
    .map((polygon) => polygon.rotate((-rotation * Math.PI) / 180).box)
    .filter(isFiniteBox)
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
        minX: Math.min(...validPolygons.map((polygon) => polygon.box.xmin)),
        maxX: Math.max(...validPolygons.map((polygon) => polygon.box.xmax)),
        minY: Math.min(...validPolygons.map((polygon) => polygon.box.ymin)),
        maxY: Math.max(...validPolygons.map((polygon) => polygon.box.ymax)),
      }
    : fallbackBounds
  return {
    component,
    outline,
    bounds,
    transform: createTransformForBounds({ bounds, width, height }),
  }
}
