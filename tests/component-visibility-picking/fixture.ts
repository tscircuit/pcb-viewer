import type { AnyCircuitElement } from "circuit-json"

export const componentCases = [
  { id: "component_top", name: "U_TOP", x: -15, layer: "top", plated: false },
  {
    id: "component_bottom",
    name: "U_BOTTOM",
    x: -5,
    layer: "bottom",
    plated: false,
  },
  { id: "component_pth_top", name: "J_TOP", x: 5, layer: "top", plated: true },
  {
    id: "component_pth_bottom",
    name: "J_BOTTOM",
    x: 15,
    layer: "bottom",
    plated: true,
  },
] as const

export const createComponentPickingFixture = (): AnyCircuitElement[] => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 50,
      height: 30,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
  ]
  for (const component of componentCases) {
    const sourceComponentId = `source_${component.id}`
    elements.push(
      {
        type: "source_component",
        source_component_id: sourceComponentId,
        name: component.name,
        ftype: "simple_chip",
      },
      {
        type: "pcb_component",
        pcb_component_id: component.id,
        source_component_id: sourceComponentId,
        center: { x: component.x, y: 0 },
        width: 4,
        height: 3,
        rotation: 0,
        obstructs_within_bounds: true,
        layer: component.layer,
      },
    )
    if (component.plated) {
      elements.push({
        type: "pcb_plated_hole",
        pcb_plated_hole_id: `hole_${component.id}`,
        pcb_component_id: component.id,
        x: component.x,
        y: 0,
        shape: "circle",
        hole_diameter: 0.8,
        outer_diameter: 1.4,
        layers: ["top", "bottom"],
      })
    } else {
      elements.push({
        type: "pcb_smtpad",
        pcb_smtpad_id: `pad_${component.id}`,
        pcb_component_id: component.id,
        x: component.x,
        y: 0,
        shape: "rect",
        width: 2,
        height: 1.5,
        layer: component.layer,
      })
    }
  }
  return elements
}
