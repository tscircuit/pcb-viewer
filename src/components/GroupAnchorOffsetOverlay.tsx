import type { AnyCircuitElement, PcbGroup, PcbComponent } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import type { HighlightedPrimitive } from "./MouseElementTracker"
import { zIndexMap } from "../lib/util/z-index-map"
import { useGlobalStore } from "../global-store"

// Constants for visual styling and thresholds
const VISUAL_CONFIG = {
  GROUP_PADDING: 1, // mm - padding around group bounds (matches PcbGroupOverlay)
  MIN_LINE_LENGTH_FOR_LABEL: 40, // px - minimum line length to show labels
  LABEL_OFFSET_ABOVE: 2, // px - label offset when positioned above line
  LABEL_OFFSET_BELOW: -18, // px - label offset when positioned below line
  LABEL_OFFSET_RIGHT: 8, // px - label offset when positioned to the right
  LABEL_OFFSET_LEFT: -80, // px - label offset when positioned to the left
  LINE_STROKE_WIDTH: 1.5,
  LINE_DASH_PATTERN: "4,4",
  COMPONENT_MARKER_RADIUS: 3,
  LABEL_FONT_SIZE: 11,
} as const

const COLORS = {
  OFFSET_LINE: "white",
  COMPONENT_MARKER_FILL: "#66ccff",
  COMPONENT_MARKER_STROKE: "white",
  LABEL_TEXT: "white",
} as const

interface Props {
  elements: AnyCircuitElement[]
  highlightedPrimitives: HighlightedPrimitive[]
  transform: Matrix
  containerWidth: number
  containerHeight: number
}

interface Point {
  x: number
  y: number
}

interface BoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/**
 * Calculates the bounding box for all components within a PCB group
 */
const calculateGroupBoundingBox = (
  groupComponents: PcbComponent[],
): BoundingBox | null => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const comp of groupComponents) {
    if (
      !comp.center ||
      typeof comp.width !== "number" ||
      typeof comp.height !== "number"
    ) {
      continue
    }

    const halfWidth = comp.width / 2
    const halfHeight = comp.height / 2

    minX = Math.min(minX, comp.center.x - halfWidth)
    maxX = Math.max(maxX, comp.center.x + halfWidth)
    minY = Math.min(minY, comp.center.y - halfHeight)
    maxY = Math.max(maxY, comp.center.y + halfHeight)
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY)
  ) {
    return null
  }
  return { minX, maxX, minY, maxY }
}

/**
 * Finds the anchor marker position at the nearest edge of the group boundary.
 * The anchor marker ("+") is displayed at the group edge closest to the logical anchor point.
 */
const findAnchorMarkerPosition = (
  anchor: Point,
  bounds: BoundingBox,
): Point => {
  const { minX, maxX, minY, maxY } = bounds

  const distToLeft = Math.abs(anchor.x - minX)
  const distToRight = Math.abs(anchor.x - maxX)
  const distToTop = Math.abs(anchor.y - maxY)
  const distToBottom = Math.abs(anchor.y - minY)

  const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom)

  // Position at the nearest edge
  if (minDist === distToLeft) return { x: minX, y: anchor.y }
  if (minDist === distToRight) return { x: maxX, y: anchor.y }
  if (minDist === distToTop) return { x: anchor.x, y: maxY }
  return { x: anchor.x, y: minY }
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
}: Props) => {
  const is_showing_pcb_groups = useGlobalStore((s) => s.is_showing_pcb_groups)

  // Early returns for cases where overlay should not be shown
  if (!is_showing_pcb_groups || highlightedPrimitives.length === 0) {
    return null
  }

  // Find the hovered component
  const hoveredPrimitive = highlightedPrimitives.find(
    (p) =>
      p._parent_pcb_component?.type === "pcb_component" ||
      p._element?.type === "pcb_component",
  )

  if (!hoveredPrimitive) return null

  const pcbComponent = (hoveredPrimitive._parent_pcb_component ||
    hoveredPrimitive._element) as PcbComponent | undefined

  if (!pcbComponent?.pcb_group_id) return null

  // Find the parent group and verify it has an anchor
  const parentGroup = elements
    .filter((el): el is PcbGroup => el.type === "pcb_group")
    .find((group) => group.pcb_group_id === pcbComponent.pcb_group_id)

  if (!parentGroup?.anchor_position) return null

  // Get component center position
  const componentCenter: Point = pcbComponent.center || {
    x: hoveredPrimitive.x,
    y: hoveredPrimitive.y,
  }

  // Calculate group bounding box with padding
  const groupComponents = elements
    .filter((el): el is PcbComponent => el.type === "pcb_component")
    .filter((comp) => comp.pcb_group_id === parentGroup.pcb_group_id)

  const boundingBox = calculateGroupBoundingBox(groupComponents)
  if (!boundingBox) return null

  // Apply padding to bounding box
  const groupBounds: BoundingBox = {
    minX: boundingBox.minX - VISUAL_CONFIG.GROUP_PADDING,
    maxX: boundingBox.maxX + VISUAL_CONFIG.GROUP_PADDING,
    minY: boundingBox.minY - VISUAL_CONFIG.GROUP_PADDING,
    maxY: boundingBox.maxY + VISUAL_CONFIG.GROUP_PADDING,
  }

  // Find where the anchor marker is visually displayed
  const anchorMarkerPosition = findAnchorMarkerPosition(
    parentGroup.anchor_position,
    groupBounds,
  )

  // Calculate offsets from the visual anchor marker position
  // This ensures displayed values match the drawn lines
  const offsetX = componentCenter.x - anchorMarkerPosition.x
  const offsetY = componentCenter.y - anchorMarkerPosition.y

  // Convert to screen coordinates
  const anchorMarkerScreen = applyToPoint(transform, anchorMarkerPosition)
  const componentScreen = applyToPoint(transform, componentCenter)

  // Calculate line lengths and label positioning
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

  // Only show labels if lines are long enough to avoid clutter
  const shouldShowXLabel = xLineLength > VISUAL_CONFIG.MIN_LINE_LENGTH_FOR_LABEL
  const shouldShowYLabel = yLineLength > VISUAL_CONFIG.MIN_LINE_LENGTH_FOR_LABEL

  // Common label styles
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
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: Decorative offset measurement lines */}
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
        {/* Horizontal offset line (X-axis) */}
        <line
          x1={anchorMarkerScreen.x}
          y1={anchorMarkerScreen.y}
          x2={componentScreen.x}
          y2={anchorMarkerScreen.y}
          stroke={COLORS.OFFSET_LINE}
          strokeWidth={VISUAL_CONFIG.LINE_STROKE_WIDTH}
          strokeDasharray={VISUAL_CONFIG.LINE_DASH_PATTERN}
        />

        {/* Vertical offset line (Y-axis) */}
        <line
          x1={componentScreen.x}
          y1={anchorMarkerScreen.y}
          x2={componentScreen.x}
          y2={componentScreen.y}
          stroke={COLORS.OFFSET_LINE}
          strokeWidth={VISUAL_CONFIG.LINE_STROKE_WIDTH}
          strokeDasharray={VISUAL_CONFIG.LINE_DASH_PATTERN}
        />

        {/* Component center marker */}
        <circle
          cx={componentScreen.x}
          cy={componentScreen.y}
          r={VISUAL_CONFIG.COMPONENT_MARKER_RADIUS}
          fill={COLORS.COMPONENT_MARKER_FILL}
          stroke={COLORS.COMPONENT_MARKER_STROKE}
          strokeWidth={1}
        />
      </svg>

      {/* X-axis offset label */}
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

      {/* Y-axis offset label */}
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
