import type { AnyCircuitElement, PcbComponent, PcbGroup } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../../global-store"
import type { HighlightedPrimitive } from "../MouseElementTracker"
import { isPcbComponent, isPcbGroup } from "./common/guards"
import {
  type AnchorOffsetTarget,
  AnchorOffsetOverlay,
} from "./AnchorOffsetOverlay"

type Point = {
  x: number
  y: number
}

interface Props {
  elements: AnyCircuitElement[]
  highlightedPrimitives: HighlightedPrimitive[]
  transform: Matrix
  containerWidth: number
  containerHeight: number
}

/**
 * Overlay that shows offsets from group anchors to their components and groups.
 * When the view toggle is on, offsets are always shown. Hover narrows the
 * view to the hovered component/group only, but pads/components still always show.
 */
export const GroupAnchorOffsetOverlay = ({
  elements,
  highlightedPrimitives,
  transform,
  containerWidth,
  containerHeight,
}: Props) => {
  const groups = elements.filter((el): el is PcbGroup => isPcbGroup(el))
  const components = elements.filter((el): el is PcbComponent =>
    isPcbComponent(el),
  )

  const hoveredComponentIds = highlightedPrimitives
    .map((primitive) => {
      if (isPcbComponent(primitive._parent_pcb_component)) {
        return primitive._parent_pcb_component.pcb_component_id
      }
      if (isPcbComponent(primitive._element)) {
        return primitive._element.pcb_component_id
      }
      return null
    })
    .filter((id): id is string => Boolean(id))

  // Helper function to traverse up the group hierarchy and collect all parent groups
  const collectParentGroups = (groupId: string, collected: Set<string>) => {
    if (collected.has(groupId)) return // Avoid infinite loops
    collected.add(groupId)

    const group = groups.find((g) => g.pcb_group_id === groupId)
    if (
      group?.position_mode === "relative_to_group_anchor" &&
      group.positioned_relative_to_pcb_group_id
    ) {
      // This group is positioned relative to another group, so add that parent too
      collectParentGroups(group.positioned_relative_to_pcb_group_id, collected)
    }
  }

  // Track hovered groups by checking if any components in the group are hovered
  // This includes traversing up the group hierarchy for nested groups
  const hoveredGroupIds = new Set<string>()
  hoveredComponentIds.forEach((componentId) => {
    const component = components.find((c) => c.pcb_component_id === componentId)
    if (!component) return

    // If component is directly positioned relative to a group anchor
    if (
      component.position_mode === "relative_to_group_anchor" &&
      component.positioned_relative_to_pcb_group_id
    ) {
      collectParentGroups(
        component.positioned_relative_to_pcb_group_id,
        hoveredGroupIds,
      )
    }

    // If component belongs to a group (via pcb_group_id)
    if (component.pcb_group_id) {
      collectParentGroups(component.pcb_group_id, hoveredGroupIds)
    }
  })

  const isShowingAnchorOffsets = useGlobalStore(
    (s) => s.is_showing_group_anchor_offsets,
  )

  if (!isShowingAnchorOffsets && hoveredComponentIds.length === 0) {
    return null
  }

  // Component-to-group targets
  const componentTargets = components
    .map((component) => {
      if (
        component.position_mode === "relative_to_group_anchor" &&
        component.positioned_relative_to_pcb_group_id
      ) {
        const parentGroup = groups.find(
          (group) =>
            group.pcb_group_id ===
            component.positioned_relative_to_pcb_group_id,
        )
        return parentGroup && parentGroup.anchor_position
          ? { component, parentGroup, type: "component" as const }
          : null
      }

      if (component.pcb_group_id) {
        const parentGroup = groups.find(
          (group) => group.pcb_group_id === component.pcb_group_id,
        )
        return parentGroup && parentGroup.anchor_position
          ? { component, parentGroup, type: "component" as const }
          : null
      }

      return null
    })
    .filter(
      (
        target,
      ): target is {
        component: PcbComponent
        parentGroup: PcbGroup
        type: "component"
      } => Boolean(target),
    )

  // Group-to-group targets
  const groupTargets = groups
    .map((group) => {
      if (
        group.position_mode === "relative_to_group_anchor" &&
        group.positioned_relative_to_pcb_group_id
      ) {
        const parentGroup = groups.find(
          (g) => g.pcb_group_id === group.positioned_relative_to_pcb_group_id,
        )
        if (parentGroup && parentGroup.anchor_position && group.center) {
          return { group, parentGroup, type: "group" as const }
        }
      }
      return null
    })
    .filter(
      (
        target,
      ): target is {
        group: PcbGroup
        parentGroup: PcbGroup
        type: "group"
      } => Boolean(target),
    )

  const targets = [...componentTargets, ...groupTargets]

  if (targets.length === 0) return null

  const shouldShowAllTargets = hoveredComponentIds.length === 0

  const targetEntries = targets.filter((target) => {
    if (target.type === "component") {
      // Only show offset for the specific hovered component, not all components in the group
      return (
        shouldShowAllTargets ||
        hoveredComponentIds.includes(target.component.pcb_component_id)
      )
    } else {
      // For group targets, show if the group or parent group is hovered
      return (
        shouldShowAllTargets ||
        hoveredGroupIds.has(target.group.pcb_group_id) ||
        hoveredGroupIds.has(target.parentGroup.pcb_group_id)
      )
    }
  })

  if (targetEntries.length === 0) return null

  const sharedTargets: AnchorOffsetTarget[] = targetEntries
    .map((target): AnchorOffsetTarget | null => {
      const anchor = target.parentGroup.anchor_position
      if (!anchor) return null

      if (target.type === "component") {
        if (!target.component.center) return null
        return {
          id: `${target.parentGroup.pcb_group_id}-${target.component.pcb_component_id}-${target.type}`,
          anchor,
          anchor_id: target.parentGroup.pcb_group_id,
          target: target.component.center,
          type: "component",
          display_offset_x: target.component.display_offset_x,
          display_offset_y: target.component.display_offset_y,
        }
      }
      // group
      if (!target.group.center) return null
      return {
        id: `${target.parentGroup.pcb_group_id}-${target.group.pcb_group_id}-${target.type}`,
        anchor,
        anchor_id: target.parentGroup.pcb_group_id,
        target: target.group.center,
        type: "group",
        display_offset_x: target.group.display_offset_x,
        display_offset_y: target.group.display_offset_y,
      }
    })
    .filter((t): t is AnchorOffsetTarget => Boolean(t))

  return (
    <AnchorOffsetOverlay
      targets={sharedTargets}
      transform={transform}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
    />
  )
}
