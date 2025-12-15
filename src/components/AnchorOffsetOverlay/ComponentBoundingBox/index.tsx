import type { AnyCircuitElement, PcbComponent, PcbGroup } from "circuit-json"
import { distance } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import { zIndexMap } from "../../../lib/util/z-index-map"
import type { HighlightedPrimitive } from "../../MouseElementTracker"
import { COLORS, VISUAL_CONFIG } from "../common/constants"
import { isPcbComponent, isPcbGroup } from "../common/guards"

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
    if (component.center && component.width && component.height) {
      const w =
        typeof component.width === "number"
          ? component.width
          : distance.parse(component.width)
      const h =
        typeof component.height === "number"
          ? component.height
          : distance.parse(component.height)
      return {
        minX: component.center.x - w / 2,
        maxX: component.center.x + w / 2,
        minY: component.center.y - h / 2,
        maxY: component.center.y + h / 2,
      }
    }
    return null
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const pad of padsAndHoles) {
    let x = 0,
      y = 0,
      w = 0,
      h = 0

    if (pad.type === "pcb_smtpad") {
      if (pad.shape === "polygon") {
        for (const pt of pad.points) {
          const px = typeof pt.x === "number" ? pt.x : distance.parse(pt.x)
          const py = typeof pt.y === "number" ? pt.y : distance.parse(pt.y)
          minX = Math.min(minX, px)
          maxX = Math.max(maxX, px)
          minY = Math.min(minY, py)
          maxY = Math.max(maxY, py)
        }
        continue
      } else if (pad.shape === "rect" || pad.shape === "rotated_rect") {
        x = pad.x
        y = pad.y
        w = pad.width
        h = pad.height
      } else if (pad.shape === "circle") {
        x = pad.x
        y = pad.y
        w = pad.radius * 2
        h = pad.radius * 2
      } else if (pad.shape === "pill" || pad.shape === "rotated_pill") {
        x = pad.x
        y = pad.y
        w = pad.width
        h = pad.height
      }
    } else if (pad.type === "pcb_plated_hole") {
      x = pad.x
      y = pad.y
      if (pad.shape === "circle") {
        w = pad.outer_diameter
        h = pad.outer_diameter
      } else if (pad.shape === "oval" || pad.shape === "pill") {
        w = pad.outer_width
        h = pad.outer_height
      } else if (pad.shape === "circular_hole_with_rect_pad") {
        w = pad.rect_pad_width
        h = pad.rect_pad_height
      } else if (
        pad.shape === "pill_hole_with_rect_pad" ||
        pad.shape === "rotated_pill_hole_with_rect_pad"
      ) {
        w = pad.rect_pad_width
        h = pad.rect_pad_height
      } else if (
        pad.shape === "hole_with_polygon_pad" &&
        (pad as any).pad_outline
      ) {
        for (const pt of (pad as any).pad_outline) {
          const px =
            (typeof pt.x === "number" ? pt.x : distance.parse(pt.x)) + x
          const py =
            (typeof pt.y === "number" ? pt.y : distance.parse(pt.y)) + y
          minX = Math.min(minX, px)
          maxX = Math.max(maxX, px)
          minY = Math.min(minY, py)
          maxY = Math.max(maxY, py)
        }
        continue
      }
    } else if (pad.type === "pcb_hole") {
      x = pad.x
      y = pad.y
      if (!pad.hole_shape || pad.hole_shape === "circle") {
        w = pad.hole_diameter
        h = pad.hole_diameter
      } else if (pad.hole_shape === "pill" || pad.hole_shape === "rect") {
        w = pad.hole_width ?? 0
        h = pad.hole_height ?? 0
      }
    }

    minX = Math.min(minX, x - w / 2)
    maxX = Math.max(maxX, x + w / 2)
    minY = Math.min(minY, y - h / 2)
    maxY = Math.max(maxY, y + h / 2)
  }

  if (!Number.isFinite(minX)) return null
  return { minX, maxX, minY, maxY }
}

export const ComponentBoundingBoxOverlay = ({
  elements,
  highlightedPrimitives,
  transform,
  containerWidth,
  containerHeight,
}: Props) => {
  const components = elements.filter((el): el is PcbComponent =>
    isPcbComponent(el),
  )
  const groups = elements.filter((el): el is PcbGroup => isPcbGroup(el))

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

    let group: PcbGroup | null = null
    if (
      component.position_mode === "relative_to_group_anchor" &&
      component.positioned_relative_to_pcb_group_id
    ) {
      group =
        groups.find(
          (g) =>
            g.pcb_group_id === component.positioned_relative_to_pcb_group_id,
        ) ?? null
    } else if (component.pcb_group_id) {
      group =
        groups.find((g) => g.pcb_group_id === component.pcb_group_id) ?? null
    }

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
