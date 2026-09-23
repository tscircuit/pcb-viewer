import type { AnyCircuitElement } from "circuit-json"

/** Stable identity for hosts to locate the component in their schematic. */
export interface ViewSchematicComponentEvent {
  source_component_id: string
  pcb_component_id: string
  refdes: string
}

export interface PadComponent extends ViewSchematicComponentEvent {
  manufacturer_part_number?: string
}

export const getPadComponent = (
  pad: AnyCircuitElement | undefined,
  elements: AnyCircuitElement[],
): PadComponent | undefined => {
  if (pad?.type !== "pcb_smtpad" && pad?.type !== "pcb_plated_hole") return
  const pcbComponent = elements.find(
    (element) =>
      element.type === "pcb_component" &&
      element.pcb_component_id === pad.pcb_component_id,
  )
  if (pcbComponent?.type !== "pcb_component") return
  const sourceComponent = elements.find(
    (element) =>
      element.type === "source_component" &&
      element.source_component_id === pcbComponent.source_component_id,
  )
  if (sourceComponent?.type !== "source_component") return
  return {
    source_component_id: sourceComponent.source_component_id,
    pcb_component_id: pcbComponent.pcb_component_id,
    refdes: sourceComponent.name,
    manufacturer_part_number: sourceComponent.manufacturer_part_number,
  }
}
