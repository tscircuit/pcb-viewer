import type { CSSProperties } from "react"
import type { AnyCircuitElement, PcbPanel, PcbBoard, Point } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../../../global-store"
import { zIndexMap } from "../../../lib/util/z-index-map"
import type { HighlightedPrimitive } from "../../MouseElementTracker"
import { COLORS, VISUAL_CONFIG } from "../common/constants"
import { isPcbPanel, isPcbBoard } from "../common/guards"

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

  const labelStyle: CSSProperties = {
    color: COLORS.LABEL_TEXT,
    mixBlendMode: "difference",
    pointerEvents: "none",
    fontSize: VISUAL_CONFIG.LABEL_FONT_SIZE,
    fontFamily: "monospace",
    fontWeight: "bold",
  }

  const targetEntries = boardTargets.filter((target) => {
    return (
      shouldShowAllTargets ||
      hoveredBoardIds.includes(target.board.pcb_board_id)
    )
  })

  if (targetEntries.length === 0) return null

  const panelAnchorScreens = new Map<string, Point>()

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: containerWidth,
        height: containerHeight,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: zIndexMap.dimensionOverlay,
      }}
    >
      <svg
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          pointerEvents: "none",
        }}
        width={containerWidth}
        height={containerHeight}
      >
        {targetEntries.map((target) => {
          const anchorPosition = target.panel.center
          const anchorKey = target.panel.pcb_panel_id

          let targetCenter: Point
          let targetId: string
          let displayOffsetX: string | undefined
          let displayOffsetY: string | undefined

          targetCenter = target.board.center as Point
          targetId = target.board.pcb_board_id
          displayOffsetX = target.board.display_offset_x
          displayOffsetY = target.board.display_offset_y

          if (!panelAnchorScreens.has(anchorKey)) {
            const screenPoint = applyToPoint(transform, anchorPosition)
            panelAnchorScreens.set(anchorKey, screenPoint)
          }

          const anchorMarkerScreen = panelAnchorScreens.get(anchorKey)!
          const targetScreen = applyToPoint(transform, targetCenter)

          const offsetX = targetCenter.x - anchorPosition.x
          const offsetY = targetCenter.y - anchorPosition.y

          const xLineLength = Math.abs(targetScreen.x - anchorMarkerScreen.x)
          const yLineLength = Math.abs(targetScreen.y - anchorMarkerScreen.y)

          const isTargetAboveAnchor = targetScreen.y < anchorMarkerScreen.y
          const isTargetRightOfAnchor = targetScreen.x > anchorMarkerScreen.x

          const xLabelOffset = isTargetAboveAnchor
            ? VISUAL_CONFIG.LABEL_OFFSET_ABOVE
            : VISUAL_CONFIG.LABEL_OFFSET_BELOW

          const yLabelOffset = isTargetRightOfAnchor
            ? VISUAL_CONFIG.LABEL_OFFSET_RIGHT
            : VISUAL_CONFIG.LABEL_OFFSET_LEFT

          const shouldShowXLabel =
            xLineLength > VISUAL_CONFIG.MIN_LINE_LENGTH_FOR_LABEL
          const shouldShowYLabel =
            yLineLength > VISUAL_CONFIG.MIN_LINE_LENGTH_FOR_LABEL

          const xLabelText = `${displayOffsetX ?? offsetX.toFixed(2)}mm`
          const yLabelText = `${displayOffsetY ?? offsetY.toFixed(2)}mm`

          return (
            <g key={`${target.panel.pcb_panel_id}-${targetId}-${target.type}`}>
              <line
                x1={anchorMarkerScreen.x}
                y1={anchorMarkerScreen.y}
                x2={targetScreen.x}
                y2={anchorMarkerScreen.y}
                stroke={COLORS.OFFSET_LINE}
                strokeWidth={VISUAL_CONFIG.LINE_STROKE_WIDTH}
                strokeDasharray={VISUAL_CONFIG.LINE_DASH_PATTERN}
              />

              <line
                x1={targetScreen.x}
                y1={anchorMarkerScreen.y}
                x2={targetScreen.x}
                y2={targetScreen.y}
                stroke={COLORS.OFFSET_LINE}
                strokeWidth={VISUAL_CONFIG.LINE_STROKE_WIDTH}
                strokeDasharray={VISUAL_CONFIG.LINE_DASH_PATTERN}
              />

              <circle
                cx={targetScreen.x}
                cy={targetScreen.y}
                r={VISUAL_CONFIG.COMPONENT_MARKER_RADIUS}
                fill={COLORS.COMPONENT_MARKER_FILL}
                stroke={COLORS.COMPONENT_MARKER_STROKE}
                strokeWidth={1}
              />

              {shouldShowXLabel && (
                <foreignObject
                  x={Math.min(anchorMarkerScreen.x, targetScreen.x)}
                  y={anchorMarkerScreen.y + xLabelOffset}
                  width={Math.abs(targetScreen.x - anchorMarkerScreen.x)}
                  height={20}
                  style={{ overflow: "visible" }}
                >
                  <div style={{ ...labelStyle, textAlign: "center" }}>
                    {xLabelText}
                  </div>
                </foreignObject>
              )}

              {shouldShowYLabel && (
                <foreignObject
                  x={targetScreen.x + yLabelOffset}
                  y={Math.min(anchorMarkerScreen.y, targetScreen.y)}
                  width={VISUAL_CONFIG.Y_LABEL_MIN_WIDTH}
                  height={Math.abs(targetScreen.y - anchorMarkerScreen.y)}
                  style={{ overflow: "visible" }}
                >
                  <div
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isTargetRightOfAnchor
                        ? "flex-start"
                        : "flex-end",
                      whiteSpace: "nowrap",
                      padding: "0 4px",
                      height: "100%",
                    }}
                  >
                    {yLabelText}
                  </div>
                </foreignObject>
              )}
            </g>
          )
        })}

        {Array.from(panelAnchorScreens.entries()).map(
          ([panelId, anchorScreen]) => (
            <g key={`anchor-${panelId}`}>
              <line
                x1={anchorScreen.x - VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
                y1={anchorScreen.y}
                x2={anchorScreen.x + VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
                y2={anchorScreen.y}
                stroke={COLORS.OFFSET_LINE}
                strokeWidth={VISUAL_CONFIG.ANCHOR_MARKER_STROKE_WIDTH}
              />
              <line
                x1={anchorScreen.x}
                y1={anchorScreen.y - VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
                x2={anchorScreen.x}
                y2={anchorScreen.y + VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
                stroke={COLORS.OFFSET_LINE}
                strokeWidth={VISUAL_CONFIG.ANCHOR_MARKER_STROKE_WIDTH}
              />
            </g>
          ),
        )}
      </svg>
    </div>
  )
}
