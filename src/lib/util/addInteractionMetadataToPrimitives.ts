import { Primitive } from "lib/types"

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
      primitiveElement &&
      (("pcb_trace_id" in primitiveElement &&
        primitiveIdsInMousedOverNet.includes(primitiveElement.pcb_trace_id!)) ||
        ("pcb_port_id" in primitiveElement &&
          primitiveIdsInMousedOverNet.includes(
            primitiveElement.pcb_port_id!,
          )) ||
        ("pcb_via_id" in primitiveElement &&
          primitiveIdsInMousedOverNet.includes(primitiveElement.pcb_via_id!)) ||
        ("pcb_component_id" in primitiveElement &&
          primitiveIdsInMousedOverNet.includes(
            primitiveElement.pcb_component_id!,
          )) ||
        (parentComponent &&
          "pcb_component_id" in parentComponent &&
          primitiveIdsInMousedOverNet.includes(
            parentComponent.pcb_component_id!,
          )))
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
