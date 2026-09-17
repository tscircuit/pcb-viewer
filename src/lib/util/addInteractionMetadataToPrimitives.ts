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
  // Large nets may include hundreds of ids. Build membership once instead of
  // searching the entire net for every primitive on every pointer movement.
  const highlightedIds = new Set(primitiveIdsInMousedOverNet)

  return primitivesWithoutInteractionMetadata.map((primitive) => {
    const element = primitive._element
    const parentComponent = primitive._parent_pcb_component
    const isMouseOver =
      primitive.layer !== "drill" &&
      drawingObjectIdsWithMouseOver.has(primitive._pcb_drawing_object_id)
    const isInHighlightedNet = Boolean(
      primitive.layer !== "drill" &&
        !isMouseOver &&
        element &&
        (("pcb_trace_id" in element &&
          highlightedIds.has(element.pcb_trace_id!)) ||
          ("pcb_port_id" in element &&
            highlightedIds.has(element.pcb_port_id!)) ||
          ("pcb_via_id" in element &&
            highlightedIds.has(element.pcb_via_id!)) ||
          ("pcb_component_id" in element &&
            highlightedIds.has(element.pcb_component_id!)) ||
          (parentComponent &&
            "pcb_component_id" in parentComponent &&
            highlightedIds.has(parentComponent.pcb_component_id!))),
    )

    // Most primitives are unaffected by a hover change. Preserve their identity
    // and avoid allocating a full second copy of the board's geometry.
    if (
      Boolean(primitive.is_mouse_over) === isMouseOver &&
      Boolean(primitive.is_in_highlighted_net) === isInHighlightedNet
    ) {
      return primitive
    }

    return {
      ...primitive,
      is_mouse_over: isMouseOver,
      is_in_highlighted_net: isInHighlightedNet,
    }
  })
}
