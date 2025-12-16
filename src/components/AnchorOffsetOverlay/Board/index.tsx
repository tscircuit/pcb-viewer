import type { CSSProperties } from "react"
import type {
  AnyCircuitElement,
  PcbBoard,
  PcbComponent,
  PcbGroup,
} from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../../../global-store"
import { zIndexMap } from "../../../lib/util/z-index-map"
import type { HighlightedPrimitive } from "../../MouseElementTracker"
import { COLORS, VISUAL_CONFIG } from "../common/constants"
import { isPcbBoard, isPcbComponent, isPcbGroup } from "../common/guards"

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

  // Track hovered groups by checking if any components in the group are hovered
  const hoveredGroupIds = new Set<string>()
  hoveredComponentIds.forEach((componentId) => {
    const component = components.find((c) => c.pcb_component_id === componentId)
    if (component?.pcb_group_id) {
      hoveredGroupIds.add(component.pcb_group_id)
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
      const boardId = component.positioned_relative_to_pcb_board_id
      if (!boardId) return null

      const board = boards.find((b) => b.pcb_board_id === boardId)
      return board ? { component, board, type: "component" as const } : null
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
      const boardId = group.positioned_relative_to_pcb_board_id
      if (!boardId || !group.center) return null

      const board = boards.find((b) => b.pcb_board_id === boardId)
      return board ? { group, board, type: "group" as const } : null
    })
    .filter(
      (target): target is { group: PcbGroup; board: PcbBoard; type: "group" } =>
        Boolean(target),
    )

  const targets = [...componentTargets, ...groupTargets]

  if (targets.length === 0) return null

  const shouldShowAllTargets = hoveredComponentIds.length === 0

  const labelStyle: CSSProperties = {
    color: COLORS.LABEL_TEXT,
    mixBlendMode: "difference",
    pointerEvents: "none",
    fontSize: VISUAL_CONFIG.LABEL_FONT_SIZE,
    fontFamily: "monospace",
    fontWeight: "bold",
  }

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

  const boardAnchorScreens = new Map<string, Point>()

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
          const anchorPosition = target.board.center
          const anchorKey = target.board.pcb_board_id

          let targetCenter: Point
          let targetId: string
          let displayOffsetX: string | undefined
          let displayOffsetY: string | undefined

          if (target.type === "component") {
            targetCenter = target.component.center as Point
            targetId = target.component.pcb_component_id
            displayOffsetX = target.component.display_offset_x
            displayOffsetY = target.component.display_offset_y
          } else {
            // Group target
            if (!target.group.center) return null
            targetCenter = {
              x: target.group.anchor_position?.x ?? target.group.center.x,
              y: target.group.anchor_position?.y ?? target.group.center.y,
            }
            targetId = target.group.pcb_group_id
            displayOffsetX = target.group.display_offset_x
            displayOffsetY = target.group.display_offset_y
          }

          if (!boardAnchorScreens.has(anchorKey)) {
            const screenPoint = applyToPoint(transform, anchorPosition)
            boardAnchorScreens.set(anchorKey, screenPoint)
          }

          const anchorMarkerScreen = boardAnchorScreens.get(anchorKey)!
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
            <g key={`${target.board.pcb_board_id}-${targetId}-${target.type}`}>
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

              {target.type === "component" ? (
                <circle
                  cx={targetScreen.x}
                  cy={targetScreen.y}
                  r={VISUAL_CONFIG.COMPONENT_MARKER_RADIUS}
                  fill={COLORS.COMPONENT_MARKER_FILL}
                  stroke={COLORS.COMPONENT_MARKER_STROKE}
                  strokeWidth={1}
                />
              ) : (
                <>
                  <line
                    x1={targetScreen.x - VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
                    y1={targetScreen.y}
                    x2={targetScreen.x + VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
                    y2={targetScreen.y}
                    stroke={COLORS.OFFSET_LINE}
                    strokeWidth={VISUAL_CONFIG.ANCHOR_MARKER_STROKE_WIDTH}
                  />
                  <line
                    x1={targetScreen.x}
                    y1={targetScreen.y - VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
                    x2={targetScreen.x}
                    y2={targetScreen.y + VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
                    stroke={COLORS.OFFSET_LINE}
                    strokeWidth={VISUAL_CONFIG.ANCHOR_MARKER_STROKE_WIDTH}
                  />
                </>
              )}

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

        {Array.from(boardAnchorScreens.entries()).map(
          ([boardId, anchorScreen]) => (
            <g key={`anchor-${boardId}`}>
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
