import type { PcbComponent } from "circuit-json"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { HighlightedPrimitive } from "./MouseElementTracker"
import { zIndexMap } from "lib/util/z-index-map"

interface Props {
    highlightedPrimitives: HighlightedPrimitive[]
    transform: Matrix
    containerWidth: number
    containerHeight: number
}

// Visual constants matching GroupAnchorOffsetOverlay for consistency
const VISUAL_CONFIG = {
    LINE_STROKE_WIDTH: 1,
    LINE_DASH_PATTERN: "4 4",
    COMPONENT_MARKER_RADIUS: 3,
    LABEL_FONT_SIZE: 12,
    LABEL_OFFSET_ABOVE: -20,
    LABEL_OFFSET_BELOW: 20,
    LABEL_OFFSET_RIGHT: 10,
    LABEL_OFFSET_LEFT: -40,
    MIN_LINE_LENGTH_FOR_LABEL: 10,
}

const COLORS = {
    OFFSET_LINE: "red",
    COMPONENT_MARKER_FILL: "rgba(255, 0, 0, 0.5)",
    COMPONENT_MARKER_STROKE: "red",
    LABEL_TEXT: "red",
}

export const PadOffsetOverlay = ({
    highlightedPrimitives,
    transform,
    containerWidth,
    containerHeight,
}: Props) => {
    // Find the first hovered primitive that is a pad or plated hole
    const hoveredPad = highlightedPrimitives.find(
        (p) =>
            p._element?.type === "pcb_smtpad" || p._element?.type === "pcb_plated_hole"
    )

    if (!hoveredPad) return null

    // Get the parent component
    const pcbComponent = (hoveredPad._parent_pcb_component) as PcbComponent | undefined

    if (!pcbComponent || !pcbComponent.center) return null

    // Pad Center (Target)
    const padCenter = { x: hoveredPad.x, y: hoveredPad.y }

    // Component Center (Origin)
    const componentCenter = pcbComponent.center

    // Transform to screen coordinates
    const padScreen = applyToPoint(transform, padCenter)
    const componentScreen = applyToPoint(transform, componentCenter)

    // Calculate Offsets (in real world units)
    const offsetX = padCenter.x - componentCenter.x
    const offsetY = padCenter.y - componentCenter.y

    // Calculate screen distances for logic
    const xLineLength = Math.abs(padScreen.x - componentScreen.x)
    const yLineLength = Math.abs(padScreen.y - componentScreen.y)

    // Label positioning logic
    const isPadAbove = padScreen.y < componentScreen.y
    const isPadRight = padScreen.x > componentScreen.x

    const xLabelOffset = isPadAbove
        ? VISUAL_CONFIG.LABEL_OFFSET_ABOVE
        : VISUAL_CONFIG.LABEL_OFFSET_BELOW

    const yLabelOffset = isPadRight
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
                {/* Horizontal Line from Component Center X to Pad X, at Component Center Y */}
                <line
                    x1={componentScreen.x}
                    y1={componentScreen.y}
                    x2={padScreen.x}
                    y2={componentScreen.y}
                    stroke={COLORS.OFFSET_LINE}
                    strokeWidth={VISUAL_CONFIG.LINE_STROKE_WIDTH}
                    strokeDasharray={VISUAL_CONFIG.LINE_DASH_PATTERN}
                />

                {/* Vertical Line from Pad X, Component Center Y to Pad X, Pad Y */}
                <line
                    x1={padScreen.x}
                    y1={componentScreen.y}
                    x2={padScreen.x}
                    y2={padScreen.y}
                    stroke={COLORS.OFFSET_LINE}
                    strokeWidth={VISUAL_CONFIG.LINE_STROKE_WIDTH}
                    strokeDasharray={VISUAL_CONFIG.LINE_DASH_PATTERN}
                />

                {/* Marker at Component Center */}
                <circle
                    cx={componentScreen.x}
                    cy={componentScreen.y}
                    r={VISUAL_CONFIG.COMPONENT_MARKER_RADIUS}
                    fill={COLORS.COMPONENT_MARKER_FILL}
                    stroke={COLORS.COMPONENT_MARKER_STROKE}
                    strokeWidth={1}
                />

                {/* Marker at Pad Center */}
                <circle
                    cx={padScreen.x}
                    cy={padScreen.y}
                    r={2} // Slightly smaller for pad center
                    fill="transparent"
                    stroke={COLORS.COMPONENT_MARKER_STROKE}
                    strokeWidth={1}
                />
            </svg>

            {shouldShowXLabel && (
                <div
                    style={{
                        ...labelStyle,
                        position: "absolute",
                        left: Math.min(componentScreen.x, padScreen.x),
                        top: componentScreen.y + (isPadAbove ? 5 : 5), // Keep it close to the horizontal axis
                        width: Math.abs(padScreen.x - componentScreen.x),
                        textAlign: "center",
                    }}
                >
                    {offsetX.toFixed(2)}
                </div>
            )}

            {shouldShowYLabel && (
                <div
                    style={{
                        ...labelStyle,
                        position: "absolute",
                        left: padScreen.x + (isPadRight ? 5 : -45), // Adjust based on side
                        top: Math.min(componentScreen.y, padScreen.y),
                        height: Math.abs(padScreen.y - componentScreen.y),
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        textAlign: isPadRight ? "left" : "right",
                    }}
                >
                    {offsetY.toFixed(2)}
                </div>
            )}
        </div>
    )
}
