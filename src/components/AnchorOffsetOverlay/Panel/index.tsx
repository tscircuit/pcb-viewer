import type { AnyCircuitElement, PcbPanel, PcbBoard, Point } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../../../global-store"
import type { HighlightedPrimitive } from "../../MouseElementTracker"
import { isPcbPanel, isPcbBoard } from "../common/guards"
import {
  type AnchorOffsetTarget,
  AnchorOffsetOverlay,
} from "../AnchorOffsetOverlay"

interface PanelAnchorOffsetOverlayProps {
  elements: AnyCircuitElement[]
  highlightedPrimitives: HighlightedPrimitive[]
  transform: Matrix
  containerWidth: number
  containerHeight: number
}

export const PanelAnchorOffsetOverlay = ({
  elements,
  highlightedPrimitives,
  transform,
  containerWidth,
  containerHeight,
}: PanelAnchorOffsetOverlayProps) => {
  const panels = elements.filter((el): el is PcbPanel => isPcbPanel(el))
  const boards = elements.filter((el): el is PcbBoard => isPcbBoard(el))

  const hoveredBoardIds = highlightedPrimitives
    .map((primitive) => {
      if (isPcbBoard(primitive._element)) {
        return primitive._element.pcb_board_id
      }
      return null
    })
    .filter((id): id is string => Boolean(id))

  const isShowingAnchorOffsets = useGlobalStore(
    (state) => state.is_showing_group_anchor_offsets,
  )

  if (!isShowingAnchorOffsets && hoveredBoardIds.length === 0) {
    return null
  }

  // Board-to-panel targets
  const boardTargets = boards
    .map((board) => {
      const panelId = board.pcb_panel_id
      const positionMode = board.position_mode
      if (!panelId || positionMode !== "relative_to_panel_anchor") return null

      const panel = panels.find((p) => p.pcb_panel_id === panelId)
      return panel ? { board, panel, type: "board" as const } : null
    })
    .filter(
      (
        target,
      ): target is {
        board: PcbBoard
        panel: PcbPanel
        type: "board"
      } => Boolean(target),
    )

  if (boardTargets.length === 0) return null

  const shouldShowAllTargets = hoveredBoardIds.length === 0

  const targetEntries = boardTargets.filter((target) => {
    return (
      shouldShowAllTargets ||
      hoveredBoardIds.includes(target.board.pcb_board_id)
    )
  })

  if (targetEntries.length === 0) return null

  const sharedTargets: AnchorOffsetTarget[] = targetEntries
    .map((target): AnchorOffsetTarget | null => {
      if (!target.board.center) return null
      return {
        id: `${target.panel.pcb_panel_id}-${target.board.pcb_board_id}-${target.type}`,
        anchor: target.panel.center,
        anchor_id: target.panel.pcb_panel_id,
        target: target.board.center,
        type: "board",
        display_offset_x: target.board.display_offset_x,
        display_offset_y: target.board.display_offset_y,
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
