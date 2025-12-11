import type {
  AnyCircuitElement,
  PcbBoard,
  PcbComponent,
  PcbGroup,
  PcbPanel,
} from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../../global-store"
import type { BoundingBox } from "../../lib/util/get-primitive-bounding-box"
import { zIndexMap } from "../../lib/util/z-index-map"
import type { HighlightedPrimitive } from "../MouseElementTracker"
import { calculateGroupBoundingBox } from "./calculateGroupBoundingBox"
import { COLORS, VISUAL_CONFIG } from "./constants"
import { findAnchorMarkerPosition } from "./findAnchorMarkerPosition"

type NamedGroup = PcbGroup | PcbPanel | PcbBoard
type AnchoredNamedGroup = NamedGroup & {
  anchor_position: { x: number; y: number }
}

const hasAnchorPosition = (group: NamedGroup): group is AnchoredNamedGroup => {
  return (
    typeof (group as any).anchor_position?.x === "number" &&
    typeof (group as any).anchor_position?.y === "number"
  )
}

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
  children?: any
}

/**
 * Overlay component that displays offset measurements from a group's anchor point
 * to the hovered component. Shows dotted lines and distance labels for X and Y axes.
 */
export const GroupAnchorOffsetOverlay = ({
  elements,
  highlightedPrimitives,
  transform,
  containerWidth,
  containerHeight,
  children,
}: Props) => {
  const is_showing_group_anchor_offsets = useGlobalStore(
    (s) => s.is_showing_group_anchor_offsets,
  )

  if (!is_showing_group_anchor_offsets || highlightedPrimitives.length === 0) {
    return null
  }

  const hoveredPrimitive = highlightedPrimitives.find(
    (p) =>
      p._parent_pcb_component?.type === "pcb_component" ||
      p._element?.type === "pcb_component",
  )

  if (!hoveredPrimitive) return null

  const pcbComponent = (hoveredPrimitive._parent_pcb_component ||
    hoveredPrimitive._element) as PcbComponent | undefined

  if (!pcbComponent) return null

  const namedGroups = elements.filter(
    (el): el is NamedGroup =>
      el.type === "pcb_group" ||
      el.type === "pcb_panel" ||
      el.type === "pcb_board",
  )

  const positionedGroupId =
    pcbComponent.positioned_relative_to_pcb_group_id ||
    pcbComponent.pcb_group_id

  const parentGroup = namedGroups.find((group) => {
    if (group.type === "pcb_group")
      return group.pcb_group_id === positionedGroupId
    if (group.type === "pcb_panel")
      return group.pcb_panel_id === positionedGroupId
    if (group.type === "pcb_board")
      return group.pcb_board_id === positionedGroupId
    return false
  })

  if (!parentGroup || !hasAnchorPosition(parentGroup)) {
    return null
  }

  const targetCenter: Point =
    hoveredPrimitive._element?.type === "pcb_smtpad"
      ? { x: hoveredPrimitive.x, y: hoveredPrimitive.y }
      : pcbComponent.center || {
          x: hoveredPrimitive.x,
          y: hoveredPrimitive.y,
        }

  const groupComponents = elements
    .filter((el): el is PcbComponent => el.type === "pcb_component")
    .filter((comp) => {
      const targetId = positionedGroupId
      return (
        comp.pcb_group_id === targetId ||
        comp.positioned_relative_to_pcb_group_id === targetId
      )
    })

  const boundingBox = (() => {
    if (parentGroup.type === "pcb_panel") {
      if (parentGroup.center && parentGroup.width && parentGroup.height) {
        return {
          minX: parentGroup.center.x - parentGroup.width / 2,
          maxX: parentGroup.center.x + parentGroup.width / 2,
          minY: parentGroup.center.y - parentGroup.height / 2,
          maxY: parentGroup.center.y + parentGroup.height / 2,
        }
      }
      return null
    }

    if (parentGroup.type === "pcb_board") {
      if (parentGroup.center && parentGroup.width && parentGroup.height) {
        return {
          minX: parentGroup.center.x - parentGroup.width / 2,
          maxX: parentGroup.center.x + parentGroup.width / 2,
          minY: parentGroup.center.y - parentGroup.height / 2,
          maxY: parentGroup.center.y + parentGroup.height / 2,
        }
      }
      return null
    }

    return calculateGroupBoundingBox(groupComponents)
  })()

  if (!boundingBox) return null

  const groupBounds: BoundingBox = {
    minX: boundingBox.minX - VISUAL_CONFIG.GROUP_PADDING,
    maxX: boundingBox.maxX + VISUAL_CONFIG.GROUP_PADDING,
    minY: boundingBox.minY - VISUAL_CONFIG.GROUP_PADDING,
    maxY: boundingBox.maxY + VISUAL_CONFIG.GROUP_PADDING,
  }

  const anchorMarkerPosition = findAnchorMarkerPosition(
    parentGroup.anchor_position,
    groupBounds,
  )

  const offsetX = targetCenter.x - anchorMarkerPosition.x
  const offsetY = targetCenter.y - anchorMarkerPosition.y

  const anchorMarkerScreen = applyToPoint(transform, anchorMarkerPosition)
  const componentScreen = applyToPoint(transform, targetCenter)

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

  const labelStyle: React.CSSProperties = {
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
          Δx: {offsetX.toFixed(2)}mm
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
          Δy: {offsetY.toFixed(2)}mm
        </div>
      )}
    </div>
  )
}
