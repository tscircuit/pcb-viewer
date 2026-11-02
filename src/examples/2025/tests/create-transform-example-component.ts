import type { AnyCircuitElement } from "circuit-json"

export function createTransformExampleComponent({
  componentNumber,
  pcbX,
}: {
  componentNumber: number
  pcbX: number
}): AnyCircuitElement[] {
  const pcb_component_id = `r${componentNumber}`
  const source_component_id = `source_r${componentNumber}`
  return [
    {
      type: "source_component",
      source_component_id,
      name: `R${componentNumber}`,
      ftype: "simple_resistor",
      resistance: 1000,
    },
    {
      type: "pcb_component",
      pcb_component_id,
      source_component_id,
      center: { x: pcbX, y: 0 },
      width: 2.8,
      height: 1.2,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
    ...[-1, 1].map(
      (offset): AnyCircuitElement => ({
        type: "pcb_smtpad",
        pcb_smtpad_id: `${pcb_component_id}_pad_${offset < 0 ? 1 : 2}`,
        pcb_component_id,
        shape: "rect",
        x: pcbX + offset,
        y: 0,
        width: 0.8,
        height: 1.2,
        layer: "top",
      }),
    ),
  ]
}
