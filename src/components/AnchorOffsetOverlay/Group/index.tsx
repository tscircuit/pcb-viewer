import type { AnyCircuitElement, PcbComponent, PcbGroup } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../../../global-store"
import { zIndexMap } from "../../../lib/util/z-index-map"
import type { HighlightedPrimitive } from "../../MouseElementTracker"
import { COLORS, VISUAL_CONFIG } from "../common/constants"
import { calculateGroupBoundingBox } from "./calculateGroupBoundingBox"
import { isPcbComponent, isPcbGroup } from "../common/guards"

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
 * Overlay that shows offsets from group anchors to their components.
 * When the view toggle is on, offsets are always shown. Hover narrows the
 * view to the hovered component only, but pads/components still always show.
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

  const isShowingAnchorOffsets = useGlobalStore(
    (s) => s.is_showing_group_anchor_offsets,
  )

  if (!isShowingAnchorOffsets && hoveredComponentIds.length === 0) {
    return null
  }

  const targets = components
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
          ? { component, parentGroup }
          : null
      }

      if (component.pcb_group_id) {
        const parentGroup = groups.find(
          (group) => group.pcb_group_id === component.pcb_group_id,
        )
        return parentGroup && parentGroup.anchor_position
          ? { component, parentGroup }
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
      } => Boolean(target),
    )

  if (targets.length === 0) return null

  const shouldShowAllTargets = hoveredComponentIds.length === 0

  const labelStyle: React.CSSProperties = {
    color: COLORS.LABEL_TEXT,
    mixBlendMode: "difference",
    pointerEvents: "none",
    fontSize: VISUAL_CONFIG.LABEL_FONT_SIZE,
    fontFamily: "monospace",
    fontWeight: "bold",
  }

  const targetEntries = targets.filter(
    ({ component }) =>
      shouldShowAllTargets ||
      hoveredComponentIds.includes(component.pcb_component_id),
  )

  if (targetEntries.length === 0) return null

  const groupAnchorScreens = new Map<string, Point>()

  targetEntries.forEach(({ parentGroup }) => {
    if (!parentGroup.anchor_position) return
    const anchorScreen = applyToPoint(transform, parentGroup.anchor_position)
    groupAnchorScreens.set(parentGroup.pcb_group_id, anchorScreen)
  })

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
        {targetEntries.map(({ component, parentGroup }) => {
          const anchor = parentGroup.anchor_position
          const center = component.center
          if (!anchor || !center) return null

          const anchorMarkerPosition: Point = { x: anchor.x, y: anchor.y }
          const targetCenter: Point = { x: center.x, y: center.y }

          const groupComponents = components.filter(
            (comp) => comp.pcb_group_id === parentGroup.pcb_group_id,
          )
          const boundingBox = calculateGroupBoundingBox(groupComponents)
          if (!boundingBox) return null

          const offsetX = targetCenter.x - anchorMarkerPosition.x
          const offsetY = targetCenter.y - anchorMarkerPosition.y

          const anchorMarkerScreen = applyToPoint(
            transform,
            anchorMarkerPosition,
          )
          const componentScreen = applyToPoint(transform, targetCenter)

          const xLineLength = Math.abs(componentScreen.x - anchorMarkerScreen.x)
          const yLineLength = Math.abs(componentScreen.y - anchorMarkerScreen.y)

          const isComponentAboveAnchor =
            componentScreen.y < anchorMarkerScreen.y
          const isComponentRightOfAnchor =
            componentScreen.x > anchorMarkerScreen.x

          const xLabelOffset = isComponentAboveAnchor
            ? VISUAL_CONFIG.LABEL_OFFSET_ABOVE
            : VISUAL_CONFIG.LABEL_OFFSET_BELOW

          const yLabelOffset = isComponentRightOfAnchor
            ? VISUAL_CONFIG.LABEL_OFFSET_RIGHT
            : VISUAL_CONFIG.LABEL_OFFSET_LEFT

          const shouldShowXLabel =
            xLineLength > VISUAL_CONFIG.MIN_LINE_LENGTH_FOR_LABEL
          const shouldShowYLabel =
            yLineLength > VISUAL_CONFIG.MIN_LINE_LENGTH_FOR_LABEL

          const xLabelText =
            component.display_offset_x ?? `Δx: ${offsetX.toFixed(2)}mm`
          const yLabelText =
            component.display_offset_y ?? `Δy: ${offsetY.toFixed(2)}mm`

          return (
            <g
              key={`${parentGroup.pcb_group_id}-${component.pcb_component_id}`}
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

              {shouldShowXLabel && (
                <foreignObject
                  x={Math.min(anchorMarkerScreen.x, componentScreen.x)}
                  y={anchorMarkerScreen.y + xLabelOffset}
                  width={Math.abs(componentScreen.x - anchorMarkerScreen.x)}
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
                  x={componentScreen.x + yLabelOffset}
                  y={Math.min(anchorMarkerScreen.y, componentScreen.y)}
                  width={20}
                  height={Math.abs(componentScreen.y - anchorMarkerScreen.y)}
                  style={{ overflow: "visible" }}
                >
                  <div
                    style={{
                      ...labelStyle,
                      display: "flex",
                      alignItems: "center",
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

        {Array.from(groupAnchorScreens.entries()).map(
          ([groupId, anchorScreen]) => (
            <g key={`anchor-${groupId}`}>
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
