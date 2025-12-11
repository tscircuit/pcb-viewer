import type { AnyCircuitElement, PcbComponent, PcbGroup } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../../global-store"
import type { BoundingBox } from "../../lib/util/get-primitive-bounding-box"
import { zIndexMap } from "../../lib/util/z-index-map"
import type { HighlightedPrimitive } from "../MouseElementTracker"
import { calculateGroupBoundingBox } from "./calculateGroupBoundingBox"
import { COLORS, VISUAL_CONFIG } from "./constants"
import { findAnchorMarkerPosition } from "./findAnchorMarkerPosition"

type Point = {
  x: number
  y: number
}

const rotatePoint = (
  point: Point,
  center: Point,
  rotationDeg: number,
): Point => {
  if (!rotationDeg) return point
  const radians = (rotationDeg * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const translatedX = point.x - center.x
  const translatedY = point.y - center.y

  return {
    x: translatedX * cos - translatedY * sin + center.x,
    y: translatedX * sin + translatedY * cos + center.y,
  }
}

const getComponentCorners = (component: PcbComponent): Point[] | null => {
  if (
    !component.center ||
    typeof component.width !== "number" ||
    typeof component.height !== "number"
  ) {
    return null
  }

  const halfWidth = component.width / 2
  const halfHeight = component.height / 2

  const baseCorners: Point[] = [
    { x: component.center.x - halfWidth, y: component.center.y - halfHeight },
    { x: component.center.x + halfWidth, y: component.center.y - halfHeight },
    { x: component.center.x + halfWidth, y: component.center.y + halfHeight },
    { x: component.center.x - halfWidth, y: component.center.y + halfHeight },
  ]

  const rotation = component.rotation ?? 0

  return baseCorners.map((corner) =>
    rotatePoint(corner, component.center!, rotation),
  )
}

const getComponentAnchor = (
  component: PcbComponent | undefined,
  fallback: Point,
): Point => {
  if (component && "anchor_position" in component && component.anchor_position)
    return component.anchor_position as Point
  if (component?.center) return component.center
  return fallback
}

const renderAnchorMarker = (position: Point, size: number, key: string) => (
  <g key={key}>
    <line
      x1={position.x - size}
      y1={position.y}
      x2={position.x + size}
      y2={position.y}
      stroke={COLORS.ANCHOR_MARKER}
      strokeWidth={1.5}
    />
    <line
      x1={position.x}
      y1={position.y - size}
      x2={position.x}
      y2={position.y + size}
      stroke={COLORS.ANCHOR_MARKER}
      strokeWidth={1.5}
    />
  </g>
)

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

  const hoveredPrimitive = highlightedPrimitives.find((p) =>
    [p._parent_pcb_component, p._element].some(
      (el) => el?.type === "pcb_component",
    ),
  )

  if (!hoveredPrimitive) return null

  const pcbComponent = (hoveredPrimitive._parent_pcb_component ||
    hoveredPrimitive._element) as PcbComponent | undefined

  const targetCenter: Point =
    hoveredPrimitive._element?.type === "pcb_smtpad"
      ? { x: hoveredPrimitive.x, y: hoveredPrimitive.y }
      : pcbComponent?.center || { x: hoveredPrimitive.x, y: hoveredPrimitive.y }

  const componentAnchor = getComponentAnchor(pcbComponent, targetCenter)

  const componentCorners = pcbComponent
    ? getComponentCorners(pcbComponent)
    : null

  const parentGroup = pcbComponent?.pcb_group_id
    ? elements
        .filter((el): el is PcbGroup => el.type === "pcb_group")
        .find((group) => group.pcb_group_id === pcbComponent.pcb_group_id)
    : undefined

  const groupComponents = parentGroup
    ? elements
        .filter((el): el is PcbComponent => el.type === "pcb_component")
        .filter((comp) => comp.pcb_group_id === parentGroup.pcb_group_id)
    : []

  const boundingBox =
    parentGroup && groupComponents.length > 0
      ? calculateGroupBoundingBox(groupComponents)
      : null

  const hasGroupAnchor = Boolean(parentGroup?.anchor_position && boundingBox)

  const groupBounds: BoundingBox | null = boundingBox
    ? {
        minX: boundingBox.minX - VISUAL_CONFIG.GROUP_PADDING,
        maxX: boundingBox.maxX + VISUAL_CONFIG.GROUP_PADDING,
        minY: boundingBox.minY - VISUAL_CONFIG.GROUP_PADDING,
        maxY: boundingBox.maxY + VISUAL_CONFIG.GROUP_PADDING,
      }
    : null

  const anchorMarkerPosition =
    hasGroupAnchor && groupBounds
      ? findAnchorMarkerPosition(parentGroup!.anchor_position!, groupBounds)
      : null

  const anchorMarkerScreen =
    anchorMarkerPosition && transform
      ? applyToPoint(transform, anchorMarkerPosition)
      : null
  const componentAnchorScreen = applyToPoint(transform, componentAnchor)

  const offsetX = anchorMarkerPosition
    ? componentAnchor.x - anchorMarkerPosition.x
    : 0
  const offsetY = anchorMarkerPosition
    ? componentAnchor.y - anchorMarkerPosition.y
    : 0

  const xLineLength = anchorMarkerScreen
    ? Math.abs(componentAnchorScreen.x - anchorMarkerScreen.x)
    : 0
  const yLineLength = anchorMarkerScreen
    ? Math.abs(componentAnchorScreen.y - anchorMarkerScreen.y)
    : 0

  const isComponentAboveAnchor = anchorMarkerScreen
    ? componentAnchorScreen.y < anchorMarkerScreen.y
    : false
  const isComponentRightOfAnchor = anchorMarkerScreen
    ? componentAnchorScreen.x > anchorMarkerScreen.x
    : false

  const xLabelOffset = isComponentAboveAnchor
    ? VISUAL_CONFIG.LABEL_OFFSET_ABOVE
    : VISUAL_CONFIG.LABEL_OFFSET_BELOW

  const yLabelOffset = isComponentRightOfAnchor
    ? VISUAL_CONFIG.LABEL_OFFSET_RIGHT
    : VISUAL_CONFIG.LABEL_OFFSET_LEFT

  const shouldShowXLabel =
    hasGroupAnchor &&
    xLineLength > 0 &&
    xLineLength > VISUAL_CONFIG.MIN_LINE_LENGTH_FOR_LABEL
  const shouldShowYLabel =
    hasGroupAnchor &&
    yLineLength > 0 &&
    yLineLength > VISUAL_CONFIG.MIN_LINE_LENGTH_FOR_LABEL

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
        {componentCorners && (
          <polygon
            points={componentCorners
              .map((corner) => applyToPoint(transform, corner))
              .map((corner) => `${corner.x},${corner.y}`)
              .join(" ")}
            fill="none"
            stroke={COLORS.COMPONENT_OUTLINE}
            strokeWidth={1.5}
          />
        )}

        {anchorMarkerScreen && (
          <g>
            <line
              x1={anchorMarkerScreen.x}
              y1={anchorMarkerScreen.y}
              x2={componentAnchorScreen.x}
              y2={anchorMarkerScreen.y}
              stroke={COLORS.OFFSET_LINE}
              strokeWidth={VISUAL_CONFIG.LINE_STROKE_WIDTH}
              strokeDasharray={VISUAL_CONFIG.LINE_DASH_PATTERN}
            />

            <line
              x1={componentAnchorScreen.x}
              y1={anchorMarkerScreen.y}
              x2={componentAnchorScreen.x}
              y2={componentAnchorScreen.y}
              stroke={COLORS.OFFSET_LINE}
              strokeWidth={VISUAL_CONFIG.LINE_STROKE_WIDTH}
              strokeDasharray={VISUAL_CONFIG.LINE_DASH_PATTERN}
            />
          </g>
        )}

        {renderAnchorMarker(
          componentAnchorScreen,
          VISUAL_CONFIG.COMPONENT_ANCHOR_MARKER_SIZE,
          "component-anchor",
        )}

        {anchorMarkerScreen &&
          renderAnchorMarker(
            anchorMarkerScreen,
            VISUAL_CONFIG.GROUP_ANCHOR_MARKER_SIZE,
            "group-anchor",
          )}
      </svg>

      {shouldShowXLabel && anchorMarkerScreen && (
        <div
          style={{
            ...labelStyle,
            position: "absolute",
            left: Math.min(anchorMarkerScreen.x, componentAnchorScreen.x),
            top: anchorMarkerScreen.y + xLabelOffset,
            width: Math.abs(componentAnchorScreen.x - anchorMarkerScreen.x),
            textAlign: "center",
          }}
        >
          Δx: {offsetX.toFixed(2)}mm
        </div>
      )}

      {shouldShowYLabel && anchorMarkerScreen && (
        <div
          style={{
            ...labelStyle,
            position: "absolute",
            left: componentAnchorScreen.x + yLabelOffset,
            top: Math.min(anchorMarkerScreen.y, componentAnchorScreen.y),
            height: Math.abs(componentAnchorScreen.y - anchorMarkerScreen.y),
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
