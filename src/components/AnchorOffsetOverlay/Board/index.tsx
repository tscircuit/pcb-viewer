import type { CSSProperties } from "react"
import type { AnyCircuitElement, PcbBoard, PcbComponent } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../../../global-store"
import { zIndexMap } from "../../../lib/util/z-index-map"
import type { HighlightedPrimitive } from "../../MouseElementTracker"
import { COLORS, VISUAL_CONFIG } from "../common/constants"
import {
  isBoardAnchoredComponent,
  isPcbBoard,
  isPcbComponent,
} from "../common/guards"

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

const getHoveredComponent = (
  highlightedPrimitives: HighlightedPrimitive[],
): PcbComponent | undefined => {
  for (const primitive of highlightedPrimitives) {
    if (isPcbComponent(primitive._parent_pcb_component)) {
      return primitive._parent_pcb_component
    }

    if (isPcbComponent(primitive._element)) {
      return primitive._element
    }
  }

  return undefined
}

export const BoardAnchorOffsetOverlay = ({
  elements,
  highlightedPrimitives,
  transform,
  containerWidth,
  containerHeight,
}: Props) => {
  const isShowingAnchorOffsets = useGlobalStore(
    (state) => state.is_showing_group_anchor_offsets,
  )

  if (!isShowingAnchorOffsets || highlightedPrimitives.length === 0) {
    return null
  }

  const hoveredComponent = getHoveredComponent(highlightedPrimitives)

  if (!hoveredComponent) return null

  const targetBoardId = isBoardAnchoredComponent(hoveredComponent)
    ? hoveredComponent.positioned_relative_to_pcb_board_id
    : undefined

  if (!targetBoardId) return null

  const targetBoard = elements.find(
    (element): element is PcbBoard =>
      isPcbBoard(element) && element.pcb_board_id === targetBoardId,
  )

  if (!targetBoard) return null

  const anchorPosition: Point = targetBoard.center
  const componentCenter: Point = hoveredComponent.center

  const offsetX = componentCenter.x - anchorPosition.x
  const offsetY = componentCenter.y - anchorPosition.y

  const anchorMarkerScreen = applyToPoint(transform, anchorPosition)
  const componentScreen = applyToPoint(transform, componentCenter)

  const xLineLength = Math.abs(componentScreen.x - anchorMarkerScreen.x)
  const yLineLength = Math.abs(componentScreen.y - anchorMarkerScreen.y)

  const isComponentAboveAnchor = componentScreen.y < anchorMarkerScreen.y
  const isComponentRightOfAnchor = componentScreen.x > anchorMarkerScreen.x

  const xLabelOffset = isComponentAboveAnchor
    ? VISUAL_CONFIG.LABEL_OFFSET_ABOVE
    : VISUAL_CONFIG.LABEL_OFFSET_BELOW

  const yLabelOffset = isComponentRightOfAnchor
    ? VISUAL_CONFIG.LABEL_OFFSET_RIGHT
    : VISUAL_CONFIG.LABEL_OFFSET_LEFT

  const shouldShowXLabel = xLineLength > VISUAL_CONFIG.MIN_LINE_LENGTH_FOR_LABEL
  const shouldShowYLabel = yLineLength > VISUAL_CONFIG.MIN_LINE_LENGTH_FOR_LABEL

  const labelStyle: CSSProperties = {
    color: COLORS.LABEL_TEXT,
    mixBlendMode: "difference",
    pointerEvents: "none",
    fontSize: VISUAL_CONFIG.LABEL_FONT_SIZE,
    fontFamily: "monospace",
    fontWeight: "bold",
  }

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
        <line
          x1={anchorMarkerScreen.x}
          y1={anchorMarkerScreen.y}
          x2={componentScreen.x}
          y2={anchorMarkerScreen.y}
          stroke={COLORS.OFFSET_LINE}
          strokeWidth={VISUAL_CONFIG.LINE_STROKE_WIDTH}
          strokeDasharray={VISUAL_CONFIG.LINE_DASH_PATTERN}
        />

        <line
          x1={componentScreen.x}
          y1={anchorMarkerScreen.y}
          x2={componentScreen.x}
          y2={componentScreen.y}
          stroke={COLORS.OFFSET_LINE}
          strokeWidth={VISUAL_CONFIG.LINE_STROKE_WIDTH}
          strokeDasharray={VISUAL_CONFIG.LINE_DASH_PATTERN}
        />

        <line
          x1={anchorMarkerScreen.x - VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
          y1={anchorMarkerScreen.y}
          x2={anchorMarkerScreen.x + VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
          y2={anchorMarkerScreen.y}
          stroke={COLORS.OFFSET_LINE}
          strokeWidth={VISUAL_CONFIG.ANCHOR_MARKER_STROKE_WIDTH}
        />
        <line
          x1={anchorMarkerScreen.x}
          y1={anchorMarkerScreen.y - VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
          x2={anchorMarkerScreen.x}
          y2={anchorMarkerScreen.y + VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
          stroke={COLORS.OFFSET_LINE}
          strokeWidth={VISUAL_CONFIG.ANCHOR_MARKER_STROKE_WIDTH}
        />

        <circle
          cx={componentScreen.x}
          cy={componentScreen.y}
          r={VISUAL_CONFIG.COMPONENT_MARKER_RADIUS}
          fill={COLORS.COMPONENT_MARKER_FILL}
          stroke={COLORS.COMPONENT_MARKER_STROKE}
          strokeWidth={1}
        />
      </svg>

      {shouldShowXLabel && (
        <div
          style={{
            ...labelStyle,
            position: "absolute",
            left: Math.min(anchorMarkerScreen.x, componentScreen.x),
            top: anchorMarkerScreen.y + xLabelOffset,
            width: Math.abs(componentScreen.x - anchorMarkerScreen.x),
            textAlign: "center",
          }}
        >
          Board Δx: {offsetX.toFixed(2)}mm
        </div>
      )}

      {shouldShowYLabel && (
        <div
          style={{
            ...labelStyle,
            position: "absolute",
            left: componentScreen.x + yLabelOffset,
            top: Math.min(anchorMarkerScreen.y, componentScreen.y),
            height: Math.abs(componentScreen.y - anchorMarkerScreen.y),
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          Board Δy: {offsetY.toFixed(2)}mm
        </div>
      )}
    </div>
  )
}
