import { Primitive } from "lib/types"

export function primitivesToBeHighlighted(
  oldPrimitives: Primitive[],
  primitiveIdsWithMouseOver: Set<string>,
  primitiveIdsInMousedOverNet: string[],
): Primitive[] {
  const newPrimitives = []
  for (const primitive of oldPrimitives) {
    const newPrimitive = { ...primitive }
    if (primitive?.layer === "drill") {
      newPrimitive.is_in_highlighted_net = false
      newPrimitive.is_mouse_over = false
    } else if (
      primitiveIdsWithMouseOver.has(primitive._pcb_drawing_object_id)
    ) {
      newPrimitive.is_mouse_over = true
    } else if (
      primitive._element &&
      (("pcb_trace_id" in primitive._element &&
        primitiveIdsInMousedOverNet.includes(
          primitive._element.pcb_trace_id,
        )) ||
        ("pcb_port_id" in primitive._element &&
          primitiveIdsInMousedOverNet.includes(
            primitive._element.pcb_port_id!,
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
