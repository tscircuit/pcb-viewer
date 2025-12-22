import type { Point } from "circuit-json"
import type { CSSProperties } from "react"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import { zIndexMap } from "../../lib/util/z-index-map"
import { COLORS, VISUAL_CONFIG } from "./common/constants"

export interface AnchorOffsetTarget {
  id: string
  anchor: Point
  anchor_id: string
  target: Point
  type: "component" | "group" | "board"
  display_offset_x?: string
  display_offset_y?: string
}

interface Props {
  targets: AnchorOffsetTarget[]
  transform: Matrix
  containerWidth: number
  containerHeight: number
}

export const AnchorOffsetOverlay = ({
  targets,
  transform,
  containerWidth,
  containerHeight,
}: Props) => {
  if (targets.length === 0) return null

  const labelStyle: CSSProperties = {
    color: COLORS.LABEL_TEXT,
    mixBlendMode: "difference",
    pointerEvents: "none",
    fontSize: VISUAL_CONFIG.LABEL_FONT_SIZE,
    fontFamily: "monospace",
    fontWeight: "bold",
  }

  const anchorScreens = new Map<string, Point>()
  targets.forEach((target) => {
    if (!anchorScreens.has(target.anchor_id)) {
      const screenPoint = applyToPoint(transform, target.anchor)
      anchorScreens.set(target.anchor_id, screenPoint)
    }
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
        {targets.map((target) => {
          const anchorPosition = target.anchor
          const anchorKey = target.anchor_id

          const targetCenter = target.target

          const anchorMarkerScreen = anchorScreens.get(anchorKey)!
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

          const xLabelText = `${
            target.display_offset_x ?? offsetX.toFixed(2)
          }mm`
          const yLabelText = `${
            target.display_offset_y ?? offsetY.toFixed(2)
          }mm`

          return (
            <g key={target.id}>
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

              {target.type === "component" || target.type === "board" ? (
                <circle
                  cx={targetScreen.x}
                  cy={targetScreen.y}
                  r={VISUAL_CONFIG.COMPONENT_MARKER_RADIUS}
                  fill={COLORS.COMPONENT_MARKER_FILL}
                  stroke={COLORS.COMPONENT_MARKER_STROKE}
                  strokeWidth={1}
                />
              ) : (
                // assumes "group"
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

        {Array.from(anchorScreens.entries()).map(([anchorId, anchorScreen]) => (
          <g key={`anchor-${anchorId}`}>
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
        ))}
      </svg>
    </div>
  )
}
