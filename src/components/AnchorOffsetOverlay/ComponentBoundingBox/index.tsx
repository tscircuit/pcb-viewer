import type { AnyCircuitElement, PcbComponent, PcbGroup } from "circuit-json"
import { getBoundsOfPcbElements, su } from "@tscircuit/circuit-json-util"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import { zIndexMap } from "../../../lib/util/z-index-map"
import type { HighlightedPrimitive } from "../../MouseElementTracker"
import { COLORS, VISUAL_CONFIG } from "../common/constants"
import { isPcbComponent } from "../common/guards"

interface Props {
  elements: AnyCircuitElement[]
  highlightedPrimitives: HighlightedPrimitive[]
  transform: Matrix
  containerWidth: number
  containerHeight: number
}

const calculateComponentBoundingBox = (
  component: PcbComponent,
  elements: AnyCircuitElement[],
): { minX: number; maxX: number; minY: number; maxY: number } | null => {
  const componentId = component.pcb_component_id
  const padsAndHoles = elements.filter(
    (el) =>
      ((el.type === "pcb_smtpad" || el.type === "pcb_plated_hole") &&
        el.pcb_component_id === componentId) ||
      (el.type === "pcb_hole" && (el as any).pcb_component_id === componentId),
  )

  if (padsAndHoles.length === 0) {
    return getBoundsOfPcbElements([component])
  }

  return getBoundsOfPcbElements(padsAndHoles)
}

export const ComponentBoundingBoxOverlay = ({
  elements,
  highlightedPrimitives,
  transform,
  containerWidth,
  containerHeight,
}: Props) => {
  const hoveredComponents = new Map<string, PcbComponent>()
  for (const primitive of highlightedPrimitives) {
    if (isPcbComponent(primitive._parent_pcb_component)) {
      hoveredComponents.set(
        primitive._parent_pcb_component.pcb_component_id,
        primitive._parent_pcb_component,
      )
    }
    if (isPcbComponent(primitive._element)) {
      hoveredComponents.set(
        primitive._element.pcb_component_id,
        primitive._element,
      )
    }
  }

  if (hoveredComponents.size === 0) return null

  const renderData: Array<{
    component: PcbComponent
    bbox: { minX: number; maxX: number; minY: number; maxY: number }
    group: PcbGroup | null
  }> = []

  for (const component of hoveredComponents.values()) {
    const bbox = calculateComponentBoundingBox(component, elements)
    if (!bbox) continue

    const groupId =
      component.positioned_relative_to_pcb_group_id ?? component.pcb_group_id
    const group = groupId
      ? (su(elements).pcb_group.get(groupId) as PcbGroup | null)
      : null

    renderData.push({ component, bbox, group })
  }

  if (renderData.length === 0) return null

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
        style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
        width={containerWidth}
        height={containerHeight}
      >
        {renderData.map(({ component, bbox, group }) => {
          const topLeft = applyToPoint(transform, {
            x: bbox.minX,
            y: bbox.maxY,
          })
          const bottomRight = applyToPoint(transform, {
            x: bbox.maxX,
            y: bbox.minY,
          })

          const screenBbox = {
            x: Math.min(topLeft.x, bottomRight.x),
            y: Math.min(topLeft.y, bottomRight.y),
            width: Math.abs(bottomRight.x - topLeft.x),
            height: Math.abs(bottomRight.y - topLeft.y),
          }

          const componentCenter = component.center ?? {
            x: (bbox.minX + bbox.maxX) / 2,
            y: (bbox.minY + bbox.maxY) / 2,
          }
          const componentCenterScreen = applyToPoint(transform, componentCenter)

          const groupAnchor = group?.anchor_position
          const groupAnchorScreen = groupAnchor
            ? applyToPoint(transform, groupAnchor)
            : null

          const hasGroupOffset =
            group &&
            groupAnchorScreen &&
            (component.position_mode === "relative_to_group_anchor" ||
              component.pcb_group_id)

          let displayOffsetX = component.display_offset_x
          let displayOffsetY = component.display_offset_y
          if (!displayOffsetX && groupAnchor) {
            const dx = componentCenter.x - groupAnchor.x
            displayOffsetX = `Δx: ${dx.toFixed(2)}mm`
          }
          if (!displayOffsetY && groupAnchor) {
            const dy = componentCenter.y - groupAnchor.y
            displayOffsetY = `Δy: ${dy.toFixed(2)}mm`
          }

          const xLineLength = groupAnchorScreen
            ? Math.abs(componentCenterScreen.x - groupAnchorScreen.x)
            : 0
          const yLineLength = groupAnchorScreen
            ? Math.abs(componentCenterScreen.y - groupAnchorScreen.y)
            : 0

          const isTargetAboveAnchor = groupAnchorScreen
            ? componentCenterScreen.y < groupAnchorScreen.y
            : false
          const isTargetRightOfAnchor = groupAnchorScreen
            ? componentCenterScreen.x > groupAnchorScreen.x
            : false

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

          const labelStyle: React.CSSProperties = {
            color: COLORS.LABEL_TEXT,
            mixBlendMode: "difference",
            pointerEvents: "none",
            fontSize: VISUAL_CONFIG.LABEL_FONT_SIZE,
            fontFamily: "monospace",
            fontWeight: "bold",
          }

          return (
            <g key={component.pcb_component_id}>
              <rect
                x={screenBbox.x}
                y={screenBbox.y}
                width={screenBbox.width}
                height={screenBbox.height}
                fill="none"
                stroke="white"
                strokeWidth={1.5}
                strokeDasharray="4,4"
              />

              <line
                x1={componentCenterScreen.x - 6}
                y1={componentCenterScreen.y}
                x2={componentCenterScreen.x + 6}
                y2={componentCenterScreen.y}
                stroke={COLORS.COMPONENT_MARKER_STROKE}
                strokeWidth={1.5}
              />
              <line
                x1={componentCenterScreen.x}
                y1={componentCenterScreen.y - 6}
                x2={componentCenterScreen.x}
                y2={componentCenterScreen.y + 6}
                stroke={COLORS.COMPONENT_MARKER_STROKE}
                strokeWidth={1.5}
              />
              <circle
                cx={componentCenterScreen.x}
                cy={componentCenterScreen.y}
                r={VISUAL_CONFIG.COMPONENT_MARKER_RADIUS}
                fill={COLORS.COMPONENT_MARKER_FILL}
                stroke={COLORS.COMPONENT_MARKER_STROKE}
                strokeWidth={1}
              />

              {hasGroupOffset && groupAnchorScreen && (
                <>
                  <line
                    x1={groupAnchorScreen.x}
                    y1={groupAnchorScreen.y}
                    x2={componentCenterScreen.x}
                    y2={groupAnchorScreen.y}
                    stroke={COLORS.OFFSET_LINE}
                    strokeWidth={VISUAL_CONFIG.LINE_STROKE_WIDTH}
                    strokeDasharray={VISUAL_CONFIG.LINE_DASH_PATTERN}
                  />
                  <line
                    x1={componentCenterScreen.x}
                    y1={groupAnchorScreen.y}
                    x2={componentCenterScreen.x}
                    y2={componentCenterScreen.y}
                    stroke={COLORS.OFFSET_LINE}
                    strokeWidth={VISUAL_CONFIG.LINE_STROKE_WIDTH}
                    strokeDasharray={VISUAL_CONFIG.LINE_DASH_PATTERN}
                  />

                  <line
                    x1={groupAnchorScreen.x - VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
                    y1={groupAnchorScreen.y}
                    x2={groupAnchorScreen.x + VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
                    y2={groupAnchorScreen.y}
                    stroke={COLORS.OFFSET_LINE}
                    strokeWidth={VISUAL_CONFIG.ANCHOR_MARKER_STROKE_WIDTH}
                  />
                  <line
                    x1={groupAnchorScreen.x}
                    y1={groupAnchorScreen.y - VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
                    x2={groupAnchorScreen.x}
                    y2={groupAnchorScreen.y + VISUAL_CONFIG.ANCHOR_MARKER_SIZE}
                    stroke={COLORS.OFFSET_LINE}
                    strokeWidth={VISUAL_CONFIG.ANCHOR_MARKER_STROKE_WIDTH}
                  />

                  {shouldShowXLabel && (
                    <foreignObject
                      x={Math.min(groupAnchorScreen.x, componentCenterScreen.x)}
                      y={groupAnchorScreen.y + xLabelOffset}
                      width={Math.abs(
                        componentCenterScreen.x - groupAnchorScreen.x,
                      )}
                      height={20}
                      style={{ overflow: "visible" }}
                    >
                      <div style={{ ...labelStyle, textAlign: "center" }}>
                        {displayOffsetX}
                      </div>
                    </foreignObject>
                  )}

                  {shouldShowYLabel && (
                    <foreignObject
                      x={componentCenterScreen.x + yLabelOffset}
                      y={Math.min(groupAnchorScreen.y, componentCenterScreen.y)}
                      width={20}
                      height={Math.abs(
                        componentCenterScreen.y - groupAnchorScreen.y,
                      )}
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
                        {displayOffsetY}
                      </div>
                    </foreignObject>
                  )}
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
