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

  // Helper function to traverse up the group hierarchy and collect all parent groups
  const collectParentGroups = (groupId: string, collected: Set<string>) => {
    if (collected.has(groupId)) return // Avoid infinite loops
    collected.add(groupId)

    const group = groups.find((g) => g.pcb_group_id === groupId)
    if (
      group?.position_mode === "relative_to_group_anchor" &&
      group.positioned_relative_to_pcb_group_id
    ) {
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

    // If component is directly positioned relative to a group anchor
    if (
      component.position_mode === "relative_to_group_anchor" &&
      component.positioned_relative_to_pcb_group_id
    ) {
      collectParentGroups(
        component.positioned_relative_to_pcb_group_id,
        hoveredGroupIds,
      )
    }

    // If component belongs to a group (via pcb_group_id)
    if (component.pcb_group_id) {
      collectParentGroups(component.pcb_group_id, hoveredGroupIds)
    }
  })

  const isShowingAnchorOffsets = useGlobalStore(
    (s) => s.is_showing_group_anchor_offsets,
  )

  if (!isShowingAnchorOffsets && hoveredComponentIds.length === 0) {
    return null
  }

  // Component-to-group targets
  const componentTargets = components
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
          ? { component, parentGroup, type: "component" as const }
          : null
      }

      if (component.pcb_group_id) {
        const parentGroup = groups.find(
          (group) => group.pcb_group_id === component.pcb_group_id,
        )
        return parentGroup && parentGroup.anchor_position
          ? { component, parentGroup, type: "component" as const }
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
        type: "component"
      } => Boolean(target),
    )

  // Group-to-group targets
  const groupTargets = groups
    .map((group) => {
      if (
        group.position_mode === "relative_to_group_anchor" &&
        group.positioned_relative_to_pcb_group_id
      ) {
        const parentGroup = groups.find(
          (g) => g.pcb_group_id === group.positioned_relative_to_pcb_group_id,
        )
        if (parentGroup && parentGroup.anchor_position && group.center) {
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

  const labelStyle: React.CSSProperties = {
    color: COLORS.LABEL_TEXT,
    mixBlendMode: "difference",
    pointerEvents: "none",
    fontSize: VISUAL_CONFIG.LABEL_FONT_SIZE,
    fontFamily: "monospace",
    fontWeight: "bold",
  }

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

  const groupAnchorScreens = new Map<string, Point>()

  targetEntries.forEach((target) => {
    if (!target.parentGroup.anchor_position) return
    const anchorScreen = applyToPoint(
      transform,
      target.parentGroup.anchor_position,
    )
    groupAnchorScreens.set(target.parentGroup.pcb_group_id, anchorScreen)
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
        {targetEntries.map((target) => {
          const anchor = target.parentGroup.anchor_position
          if (!anchor) return null

          const anchorMarkerPosition: Point = { x: anchor.x, y: anchor.y }

          let targetCenter: Point | null = null
          let targetId: string
          let displayOffsetX: string | undefined
          let displayOffsetY: string | undefined

          if (target.type === "component") {
            const center = target.component.center
            if (!center) return null
            targetCenter = { x: center.x, y: center.y }
            targetId = target.component.pcb_component_id
            displayOffsetX = target.component.display_offset_x
            displayOffsetY = target.component.display_offset_y
          } else {
            // Group target
            if (!target.group.center) return null
            targetCenter = {
              x: target.group.center.x,
              y: target.group.center.y,
            }
            targetId = target.group.pcb_group_id
            displayOffsetX = target.group.display_offset_x
            displayOffsetY = target.group.display_offset_y
          }

          const offsetX = targetCenter.x - anchorMarkerPosition.x
          const offsetY = targetCenter.y - anchorMarkerPosition.y

          const anchorMarkerScreen = applyToPoint(
            transform,
            anchorMarkerPosition,
          )
          const targetScreen = applyToPoint(transform, targetCenter)

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

          const xLabelText = displayOffsetX
            ? displayOffsetX
            : `Δx: ${offsetX.toFixed(2)}mm`
          const yLabelText = displayOffsetY
            ? displayOffsetY
            : `Δy: ${offsetY.toFixed(2)}mm`

          return (
            <g
              key={`${target.parentGroup.pcb_group_id}-${targetId}-${target.type}`}
            >
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
                  width={20}
                  height={Math.abs(targetScreen.y - anchorMarkerScreen.y)}
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
