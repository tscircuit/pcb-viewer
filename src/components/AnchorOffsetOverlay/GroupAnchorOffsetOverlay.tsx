import type { AnyCircuitElement, PcbComponent, PcbGroup } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../../global-store"
import type { HighlightedPrimitive } from "../MouseElementTracker"
import {
  AnchorOffsetOverlay,
  type AnchorOffsetTarget,
} from "./AnchorOffsetOverlay"
import { isPcbComponent, isPcbGroup } from "./common/guards"

type Point = {
  x: number
  y: number
}

const resolveGroupAnchorPosition = (group: PcbGroup): Point | null => {
  if (group.anchor_position) {
    if (Array.isArray(group.anchor_position)) {
      return {
        x: group.anchor_position[0] ?? 0,
        y: group.anchor_position[1] ?? 0,
      }
    }
    return {
      x: group.anchor_position.x,
      y: group.anchor_position.y,
    }
  }

  if (!group.center) return null

  const { x, y } = group.center
  if (
    typeof group.width === "number" &&
    typeof group.height === "number" &&
    group.anchor_alignment
  ) {
    const halfWidth = group.width / 2
    const halfHeight = group.height / 2
    switch (group.anchor_alignment) {
      case "top_left":
        return { x: x - halfWidth, y: y + halfHeight }
      case "top_center":
        return { x, y: y + halfHeight }
      case "top_right":
        return { x: x + halfWidth, y: y + halfHeight }
      case "center_left":
        return { x: x - halfWidth, y }
      case "center_right":
        return { x: x + halfWidth, y }
      case "bottom_left":
        return { x: x - halfWidth, y: y - halfHeight }
      case "bottom_center":
        return { x, y: y - halfHeight }
      case "bottom_right":
        return { x: x + halfWidth, y: y - halfHeight }
      default:
        return { x, y }
    }
  }

  return { x, y }
}

const findComponentParentGroup = (
  component: PcbComponent,
  groups: PcbGroup[],
): PcbGroup | undefined => {
  if (component.positioned_relative_to_pcb_group_id) {
    const group = groups.find(
      (g) => g.pcb_group_id === component.positioned_relative_to_pcb_group_id,
    )
    if (group) return group
  }

  if (component.pcb_group_id) {
    const group = groups.find((g) => g.pcb_group_id === component.pcb_group_id)
    if (group) return group
  }

  return groups.find((g) =>
    g.pcb_component_ids?.includes(component.pcb_component_id),
  )
}

const normalizeDisplayOffset = (
  displayOffset: string | number | undefined,
): string | undefined => {
  if (displayOffset === undefined || displayOffset === null) return undefined
  return String(displayOffset).replace(/mm$/i, "")
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
  const isShowingAnchorOffsets = useGlobalStore(
    (state) => state.is_showing_group_anchor_offsets,
  )

  const hoveredComponentIds = highlightedPrimitives
    .map((primitive) => {
      if (isPcbComponent(primitive._parent_pcb_component)) {
        return primitive._parent_pcb_component.pcb_component_id
      }
      if (isPcbComponent(primitive._element)) {
        return primitive._element.pcb_component_id
      }
      if (
        primitive._element &&
        "pcb_component_id" in primitive._element &&
        typeof primitive._element.pcb_component_id === "string"
      ) {
        return primitive._element.pcb_component_id
      }
      return null
    })
    .filter((id): id is string => Boolean(id))

  if (!isShowingAnchorOffsets && hoveredComponentIds.length === 0) {
    return null
  }

  const groups = elements.filter((el): el is PcbGroup => isPcbGroup(el))
  const components = elements.filter((el): el is PcbComponent =>
    isPcbComponent(el),
  )

  // Helper function to traverse up the group hierarchy and collect all parent groups
  const collectParentGroups = (groupId: string, collected: Set<string>) => {
    if (collected.has(groupId)) return // Avoid infinite loops
    collected.add(groupId)

    const group = groups.find((g) => g.pcb_group_id === groupId)
    if (group?.positioned_relative_to_pcb_group_id) {
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

    const parentGroup = findComponentParentGroup(component, groups)
    if (parentGroup) {
      collectParentGroups(parentGroup.pcb_group_id, hoveredGroupIds)
    }
  })

  // Component-to-group targets
  const componentTargets = components
    .map((component) => {
      const parentGroup = findComponentParentGroup(component, groups)
      if (!parentGroup) return null
      return resolveGroupAnchorPosition(parentGroup)
        ? { component, parentGroup, type: "component" as const }
        : null
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

  // Group-to-group targets (anchor-to-anchor offsets)
  const groupTargets = groups
    .map((group) => {
      if (group.positioned_relative_to_pcb_group_id) {
        const parentGroup = groups.find(
          (g) => g.pcb_group_id === group.positioned_relative_to_pcb_group_id,
        )
        if (
          parentGroup &&
          resolveGroupAnchorPosition(parentGroup) &&
          resolveGroupAnchorPosition(group)
        ) {
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
      const anchor = resolveGroupAnchorPosition(target.parentGroup)
      if (!anchor) return null

      if (target.type === "component") {
        if (!target.component.center) return null
        return {
          id: `${target.parentGroup.pcb_group_id}-${target.component.pcb_component_id}-${target.type}`,
          anchor,
          anchor_id: target.parentGroup.pcb_group_id,
          target: target.component.center,
          type: "component",
          display_offset_x: normalizeDisplayOffset(
            target.component.display_offset_x,
          ),
          display_offset_y: normalizeDisplayOffset(
            target.component.display_offset_y,
          ),
        }
      }
      // group - use anchor_position for anchor-to-anchor offsets
      const groupAnchor = resolveGroupAnchorPosition(target.group)
      if (!groupAnchor) return null
      return {
        id: `${target.parentGroup.pcb_group_id}-${target.group.pcb_group_id}-${target.type}`,
        anchor,
        anchor_id: target.parentGroup.pcb_group_id,
        target: groupAnchor,
        type: "group",
        display_offset_x: normalizeDisplayOffset(target.group.display_offset_x),
        display_offset_y: normalizeDisplayOffset(target.group.display_offset_y),
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
