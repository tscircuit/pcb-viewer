import { su, transformPCBElement } from "@tscircuit/circuit-json-util"
import type {
  EditPcbGroupLocationEvent,
  ManualEditEvent,
} from "@tscircuit/props"
import type {
  AnyCircuitElement,
  CircuitJson,
  PcbComponent,
  PcbGroup,
  PcbTraceHint,
  SourceBoard,
  SourceGroup,
} from "circuit-json"
import { applyToPoint, translate } from "transformation-matrix"

type SourceComponentElement = Extract<
  AnyCircuitElement,
  { type: "source_component" }
>

export type PcbManualEditEvent = ManualEditEvent | EditPcbGroupLocationEvent

export function getGroupAndMemberIds({
  circuitJson,
  pcbGroupId,
}: {
  circuitJson: AnyCircuitElement[]
  pcbGroupId: string
}): {
  pcbGroupIds: Set<string>
  pcbComponentIds: Set<string>
} {
  const pcbGroups = circuitJson.filter(
    (el): el is PcbGroup => el.type === "pcb_group",
  )
  const sourceGroups = circuitJson.filter(
    (el): el is SourceGroup => el.type === "source_group",
  )
  const sourceComponents = circuitJson.filter(
    (el): el is SourceComponentElement => el.type === "source_component",
  )
  const pcbComponents = circuitJson.filter(
    (el): el is PcbComponent => el.type === "pcb_component",
  )

  const sourceGroupChildren = new Map<string, string[]>()
  for (const sg of sourceGroups) {
    if (sg.parent_source_group_id) {
      const children = sourceGroupChildren.get(sg.parent_source_group_id) ?? []
      children.push(sg.source_group_id)
      sourceGroupChildren.set(sg.parent_source_group_id, children)
    }
  }

  const pcbGroupIds = new Set<string>([pcbGroupId])
  const sourceGroupIds = new Set<string>()

  const addSourceGroupWithDescendants = (sourceGroupId: string) => {
    if (sourceGroupIds.has(sourceGroupId)) return
    sourceGroupIds.add(sourceGroupId)
    const children = sourceGroupChildren.get(sourceGroupId) ?? []
    for (const childId of children) {
      addSourceGroupWithDescendants(childId)
    }
  }

  const rootPcbGroup = pcbGroups.find((g) => g.pcb_group_id === pcbGroupId)
  if (rootPcbGroup?.source_group_id) {
    addSourceGroupWithDescendants(rootPcbGroup.source_group_id)
  }

  let changed = true
  while (changed) {
    changed = false
    for (const group of pcbGroups) {
      if (pcbGroupIds.has(group.pcb_group_id)) continue
      const isDescendantBySource =
        Boolean(group.source_group_id) &&
        sourceGroupIds.has(group.source_group_id)
      const isDescendantByRelativeGroup =
        Boolean(group.positioned_relative_to_pcb_group_id) &&
        pcbGroupIds.has(group.positioned_relative_to_pcb_group_id!)
      if (isDescendantBySource || isDescendantByRelativeGroup) {
        pcbGroupIds.add(group.pcb_group_id)
        if (group.source_group_id) {
          addSourceGroupWithDescendants(group.source_group_id)
        }
        changed = true
      }
    }
  }

  const memberSourceComponentIds = new Set<string>()
  for (const sc of sourceComponents) {
    if (sc.source_group_id && sourceGroupIds.has(sc.source_group_id)) {
      memberSourceComponentIds.add(sc.source_component_id)
    }
  }

  const pcbComponentIds = new Set<string>()
  for (const group of pcbGroups) {
    if (!pcbGroupIds.has(group.pcb_group_id)) continue
    if (Array.isArray(group.pcb_component_ids)) {
      for (const compId of group.pcb_component_ids) {
        pcbComponentIds.add(compId)
      }
    }
  }

  for (const comp of pcbComponents) {
    if (
      (comp.pcb_group_id && pcbGroupIds.has(comp.pcb_group_id)) ||
      (comp.positioned_relative_to_pcb_group_id &&
        pcbGroupIds.has(comp.positioned_relative_to_pcb_group_id)) ||
      (comp.source_component_id &&
        memberSourceComponentIds.has(comp.source_component_id))
    ) {
      pcbComponentIds.add(comp.pcb_component_id)
    }
  }

  return { pcbGroupIds, pcbComponentIds }
}

export function getSelectablePcbGroupForComponent({
  circuitJson,
  pcbComponent,
}: {
  circuitJson: AnyCircuitElement[]
  pcbComponent: PcbComponent
}): PcbGroup | null {
  const pcbGroups = circuitJson.filter(
    (el): el is PcbGroup => el.type === "pcb_group",
  )
  if (pcbGroups.length === 0) return null

  const sourceGroups = circuitJson.filter(
    (el): el is SourceGroup => el.type === "source_group",
  )
  const sourceBoards = circuitJson.filter(
    (el): el is SourceBoard => el.type === "source_board",
  )
  const sourceComponents = circuitJson.filter(
    (el): el is SourceComponentElement => el.type === "source_component",
  )

  const directGroupId =
    pcbComponent.pcb_group_id ??
    pcbComponent.positioned_relative_to_pcb_group_id
  let pcbGroup = directGroupId
    ? pcbGroups.find((g) => g.pcb_group_id === directGroupId)
    : undefined

  if (!pcbGroup) {
    pcbGroup = pcbGroups.find(
      (g) =>
        Array.isArray(g.pcb_component_ids) &&
        g.pcb_component_ids.includes(pcbComponent.pcb_component_id),
    )
  }

  if (!pcbGroup && pcbComponent.source_component_id) {
    const sourceComp = sourceComponents.find(
      (sc) => sc.source_component_id === pcbComponent.source_component_id,
    )
    if (sourceComp?.source_group_id) {
      pcbGroup = pcbGroups.find(
        (g) => g.source_group_id === sourceComp.source_group_id,
      )
    }
  }

  if (!pcbGroup) return null

  if (
    pcbGroup.source_group_id &&
    sourceBoards.some((sb) => sb.source_group_id === pcbGroup.source_group_id)
  ) {
    return null
  }

  const sourceGroup = pcbGroup.source_group_id
    ? sourceGroups.find((sg) => sg.source_group_id === pcbGroup.source_group_id)
    : undefined

  const hasParentViaPcbGroup = Boolean(
    pcbGroup.positioned_relative_to_pcb_group_id ||
      pcbGroup.positioned_relative_to_pcb_board_id,
  )

  if (sourceGroup) {
    if (!sourceGroup.parent_source_group_id && !hasParentViaPcbGroup) {
      return null
    }
    return pcbGroup
  }

  const hasBoardInCircuit = circuitJson.some((el) => el.type === "pcb_board")
  if (!hasParentViaPcbGroup && !hasBoardInCircuit) {
    return null
  }

  return pcbGroup
}

export function applyEditEvents({
  circuitJson,
  editEvents,
}: {
  circuitJson: CircuitJson
  editEvents: PcbManualEditEvent[]
}): CircuitJson {
  if (editEvents.length === 0) return circuitJson

  let editedCircuitJson = structuredClone(circuitJson)

  for (const editEvent of editEvents) {
    if (editEvent.edit_event_type === "edit_pcb_component_location") {
      const pcbComponent = su(editedCircuitJson).pcb_component.get(
        editEvent.pcb_component_id,
      )
      const isAlreadyAtEditedCenter =
        pcbComponent?.center.x === editEvent.new_center.x &&
        pcbComponent.center.y === editEvent.new_center.y
      if (isAlreadyAtEditedCenter) continue

      const pcbToEditedPcbTransform = translate(
        editEvent.new_center.x - editEvent.original_center.x,
        editEvent.new_center.y - editEvent.original_center.y,
      )
      editedCircuitJson = editedCircuitJson.map((element) =>
        "pcb_component_id" in element &&
        element.pcb_component_id === editEvent.pcb_component_id
          ? transformPCBElement(element, pcbToEditedPcbTransform)
          : element,
      )
      continue
    }

    if (editEvent.edit_event_type === "edit_pcb_group_location") {
      const pcbGroup = su(editedCircuitJson).pcb_group.get(
        editEvent.pcb_group_id,
      )
      const isAlreadyAtEditedCenter =
        pcbGroup?.center.x === editEvent.new_center.x &&
        pcbGroup.center.y === editEvent.new_center.y
      if (isAlreadyAtEditedCenter) continue

      const pcbToEditedPcbTransform = translate(
        editEvent.new_center.x - editEvent.original_center.x,
        editEvent.new_center.y - editEvent.original_center.y,
      )
      const { pcbGroupIds, pcbComponentIds } = getGroupAndMemberIds({
        circuitJson: editedCircuitJson,
        pcbGroupId: editEvent.pcb_group_id,
      })

      editedCircuitJson = editedCircuitJson.map((element) => {
        if (
          element.type === "pcb_group" &&
          pcbGroupIds.has(element.pcb_group_id)
        ) {
          return {
            ...element,
            center: applyToPoint(pcbToEditedPcbTransform, element.center),
            ...(element.anchor_position
              ? {
                  anchor_position: applyToPoint(
                    pcbToEditedPcbTransform,
                    element.anchor_position,
                  ),
                }
              : {}),
            ...(element.outline
              ? {
                  outline: element.outline.map((point) =>
                    applyToPoint(pcbToEditedPcbTransform, point),
                  ),
                }
              : {}),
          }
        }
        if (
          ("pcb_component_id" in element &&
            typeof element.pcb_component_id === "string" &&
            pcbComponentIds.has(element.pcb_component_id)) ||
          ("pcb_group_id" in element &&
            typeof element.pcb_group_id === "string" &&
            pcbGroupIds.has(element.pcb_group_id))
        ) {
          return transformPCBElement(element, pcbToEditedPcbTransform)
        }
        return element
      })
      continue
    }

    if (editEvent.edit_event_type === "edit_schematic_component_location") {
      editedCircuitJson = editedCircuitJson.map((element) =>
        element.type === "schematic_component" &&
        element.schematic_component_id === editEvent.schematic_component_id
          ? { ...element, center: editEvent.new_center }
          : element,
      )
      continue
    }

    if (editEvent.edit_event_type !== "edit_pcb_trace_hint") continue
    if (!editEvent.pcb_trace_hint_id) continue

    const pcbTraceHint = su(editedCircuitJson).pcb_trace_hint.get(
      editEvent.pcb_trace_hint_id,
    )
    if (pcbTraceHint) {
      editedCircuitJson = editedCircuitJson.map((element) =>
        element.type === "pcb_trace_hint" &&
        element.pcb_trace_hint_id === editEvent.pcb_trace_hint_id
          ? { ...element, route: editEvent.route }
          : element,
      )
      continue
    }

    const pcbPort = su(editedCircuitJson).pcb_port.get(editEvent.pcb_port_id)
    if (!pcbPort?.pcb_component_id) continue

    const newPcbTraceHint: PcbTraceHint = {
      type: "pcb_trace_hint",
      pcb_trace_hint_id: editEvent.pcb_trace_hint_id,
      route: editEvent.route,
      pcb_port_id: editEvent.pcb_port_id,
      pcb_component_id: pcbPort.pcb_component_id,
    }
    editedCircuitJson = editedCircuitJson
      .filter(
        (element) =>
          element.type !== "pcb_trace_hint" ||
          element.pcb_port_id !== editEvent.pcb_port_id,
      )
      .concat(newPcbTraceHint)
  }

  return editedCircuitJson
}
