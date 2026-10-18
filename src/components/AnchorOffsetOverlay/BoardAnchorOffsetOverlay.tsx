import type {
  AnyCircuitElement,
  PcbBoard,
  PcbComponent,
  PcbGroup,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../../global-store"
import type { HighlightedPrimitive } from "../MouseElementTracker"
import { isPcbBoard, isPcbComponent, isPcbGroup } from "./common/guards"
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

export const BoardAnchorOffsetOverlay = ({
  elements,
  highlightedPrimitives,
  transform,
  containerWidth,
  containerHeight,
}: Props) => {
  const boards = elements.filter((el): el is PcbBoard => isPcbBoard(el))
  const components = elements.filter((el): el is PcbComponent =>
    isPcbComponent(el),
  )
  const groups = elements.filter((el): el is PcbGroup => isPcbGroup(el))

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

  const collectParentGroups = (groupId: string, collected: Set<string>) => {
    if (collected.has(groupId)) return
    collected.add(groupId)
    const group = groups.find((g) => g.pcb_group_id === groupId)
    if (group?.positioned_relative_to_pcb_group_id) {
      collectParentGroups(group.positioned_relative_to_pcb_group_id, collected)
    }
  }

  // Track hovered groups by checking if any components in the group are hovered
  const hoveredGroupIds = new Set<string>()
  hoveredComponentIds.forEach((componentId) => {
    const component = components.find((c) => c.pcb_component_id === componentId)
    if (!component) return
    if (component.positioned_relative_to_pcb_group_id) {
      collectParentGroups(
        component.positioned_relative_to_pcb_group_id,
        hoveredGroupIds,
      )
    }
    if (component.pcb_group_id) {
      collectParentGroups(component.pcb_group_id, hoveredGroupIds)
    }
  })

  const isShowingAnchorOffsets = useGlobalStore(
    (state) => state.is_showing_group_anchor_offsets,
  )

  if (!isShowingAnchorOffsets && hoveredComponentIds.length === 0) {
    return null
  }

  // Component-to-board targets
  const componentTargets = components
    .map((component) => {
      const boardId =
        component.positioned_relative_to_pcb_board_id ??
        (component as PcbComponent & { pcb_board_id?: string }).pcb_board_id
      if (!boardId) return null

      const board = boards.find((b) => b.pcb_board_id === boardId)
      return board && (board.anchor_position || board.center)
        ? { component, board, type: "component" as const }
        : null
    })
    .filter(
      (
        target,
      ): target is {
        component: PcbComponent
        board: PcbBoard
        type: "component"
      } => Boolean(target),
    )

  // Group-to-board targets
  const groupTargets = groups
    .map((group) => {
      const boardId =
        group.positioned_relative_to_pcb_board_id ??
        (group as PcbGroup & { pcb_board_id?: string }).pcb_board_id
      if (!boardId || !(group.anchor_position || group.center)) return null

      const board = boards.find((b) => b.pcb_board_id === boardId)
      return board && (board.anchor_position || board.center)
        ? { group, board, type: "group" as const }
        : null
    })
    .filter(
      (target): target is { group: PcbGroup; board: PcbBoard; type: "group" } =>
        Boolean(target),
    )

  const targets = [...componentTargets, ...groupTargets]

  if (targets.length === 0) return null

  const shouldShowAllTargets = hoveredComponentIds.length === 0

  const targetEntries = targets.filter((target) => {
    if (target.type === "component") {
      return (
        shouldShowAllTargets ||
        hoveredComponentIds.includes(target.component.pcb_component_id)
      )
    } else {
      // For group targets, show if the group is hovered
      return (
        shouldShowAllTargets || hoveredGroupIds.has(target.group.pcb_group_id)
      )
    }
  })

  if (targetEntries.length === 0) return null

  const sharedTargets: AnchorOffsetTarget[] = targetEntries
    .map((target): AnchorOffsetTarget | null => {
      const boardAnchor = target.board.anchor_position ?? target.board.center
      if (!boardAnchor) return null

      if (target.type === "component") {
        if (!target.component.center) return null
        return {
          id: `${target.board.pcb_board_id}-${target.component.pcb_component_id}-${target.type}`,
          anchor: boardAnchor,
          anchor_id: target.board.pcb_board_id,
          target: target.component.center as Point,
          type: "component",
          display_offset_x: target.component.display_offset_x,
          display_offset_y: target.component.display_offset_y,
        }
      }
      // group
      const groupTarget = target.group.anchor_position ?? target.group.center
      if (!groupTarget) return null
      return {
        id: `${target.board.pcb_board_id}-${target.group.pcb_group_id}-${target.type}`,
        anchor: boardAnchor,
        anchor_id: target.board.pcb_board_id,
        target: {
          x: groupTarget.x,
          y: groupTarget.y,
        },
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
