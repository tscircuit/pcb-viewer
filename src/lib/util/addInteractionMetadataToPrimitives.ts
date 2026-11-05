import type { Primitive } from "lib/types"

export function addInteractionMetadataToPrimitives({
  primitivesWithoutInteractionMetadata,
  drawingObjectIdsWithMouseOver,
  primitiveIdsInMousedOverNet,
}: {
  primitivesWithoutInteractionMetadata: Primitive[]
  drawingObjectIdsWithMouseOver: Set<string>
  primitiveIdsInMousedOverNet: string[]
}): Primitive[] {
  const newPrimitives = []
  const highlightedPrimitiveIds = new Set(primitiveIdsInMousedOverNet)
  const hoveredPcbPortIds = new Set<string>()
  const hoveredPcbComponentIds = new Set<string>()

  for (const primitive of primitivesWithoutInteractionMetadata) {
    if (!drawingObjectIdsWithMouseOver.has(primitive._pcb_drawing_object_id)) {
      continue
    }
    const element = primitive._element
    const parentComponent = primitive._parent_pcb_component
    if (element && "pcb_port_id" in element && element.pcb_port_id) {
      hoveredPcbPortIds.add(element.pcb_port_id)
    }
    if (element && "pcb_component_id" in element && element.pcb_component_id) {
      hoveredPcbComponentIds.add(element.pcb_component_id)
    }
    if (
      parentComponent &&
      "pcb_component_id" in parentComponent &&
      parentComponent.pcb_component_id
    ) {
      hoveredPcbComponentIds.add(parentComponent.pcb_component_id)
    }
  }

  for (const primitive of primitivesWithoutInteractionMetadata) {
    const newPrimitive = { ...primitive }
    const primitiveElement = primitive._element
    const parentComponent = primitive._parent_pcb_component
    if (primitive?.layer === "drill") {
      newPrimitive.is_in_highlighted_net = false
      newPrimitive.is_mouse_over = false
    } else if (
      drawingObjectIdsWithMouseOver.has(primitive._pcb_drawing_object_id)
    ) {
      newPrimitive.is_mouse_over = true
    } else if (
      primitiveElement?.type === "pcb_trace_hint" &&
      ((primitiveElement.pcb_port_id &&
        (hoveredPcbPortIds.has(primitiveElement.pcb_port_id) ||
          highlightedPrimitiveIds.has(primitiveElement.pcb_port_id))) ||
        (primitiveElement.pcb_component_id &&
          (hoveredPcbComponentIds.has(primitiveElement.pcb_component_id) ||
            highlightedPrimitiveIds.has(primitiveElement.pcb_component_id))) ||
        (parentComponent &&
          "pcb_component_id" in parentComponent &&
          parentComponent.pcb_component_id &&
          (hoveredPcbComponentIds.has(parentComponent.pcb_component_id) ||
            highlightedPrimitiveIds.has(parentComponent.pcb_component_id))))
    ) {
      newPrimitive.is_in_highlighted_net = true
    } else if (
      primitiveElement &&
      (("pcb_trace_id" in primitiveElement &&
        highlightedPrimitiveIds.has(primitiveElement.pcb_trace_id!)) ||
        ("pcb_port_id" in primitiveElement &&
          highlightedPrimitiveIds.has(primitiveElement.pcb_port_id!)) ||
        ("pcb_via_id" in primitiveElement &&
          highlightedPrimitiveIds.has(primitiveElement.pcb_via_id!)) ||
        ("pcb_component_id" in primitiveElement &&
          highlightedPrimitiveIds.has(primitiveElement.pcb_component_id!)) ||
        (parentComponent &&
          "pcb_component_id" in parentComponent &&
          highlightedPrimitiveIds.has(parentComponent.pcb_component_id!)))
    ) {
      newPrimitive.is_in_highlighted_net = true
    } else {
      newPrimitive.is_in_highlighted_net = false
      newPrimitive.is_mouse_over = false
    }
    newPrimitives.push(newPrimitive)
  }
  return newPrimitives
}
