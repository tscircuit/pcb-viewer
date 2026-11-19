import type { AnyCircuitElement, CircuitJson } from "circuit-json"
import { type ReactNode, useMemo, useState } from "react"
import { type Matrix, applyToPoint, identity } from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import {
  type LocalSkewPair,
  type LocalSkewSegment,
  computeLocalSkew,
} from "../lib/local-skew/compute-local-skew"
import { skewColor } from "../lib/local-skew/skew-color"
import { zIndexMap } from "../lib/util/z-index-map"

/** Draw the overlay 10% wider than the copper so it covers the trace (same as KiCad). */
const OVERLAY_WIDTH_FACTOR = 1.1

/** Keep overlay lines visible, in screen pixels, when zoomed far out. */
const MIN_STROKE_PIXELS = 2

/** The hovered piece of a pair and where to show its readout, in screen pixels. */
type HoveredSkew = {
  pair: LocalSkewPair
  segment: LocalSkewSegment
  x: number
  y: number
}

/**
 * Colours each routed differential pair by its local skew when
 * "Show Local Skew" is on. Hovering a piece shows its skew and the pair's
 * largest skew.
 */
export const LocalSkewOverlay = ({
  transform,
  elements,
  children,
}: {
  transform?: Matrix
  elements: AnyCircuitElement[]
  children: ReactNode
}) => {
  const isShowingLocalSkew = useGlobalStore((s) => s.is_showing_local_skew)
  const [hovered, setHovered] = useState<HoveredSkew | null>(null)
  const pairs = useMemo(() => {
    if (!isShowingLocalSkew) return []
    return computeLocalSkew(elements as CircuitJson)
  }, [isShowingLocalSkew, elements])

  if (pairs.length === 0) return children

  const matrix = transform ?? identity()
  const pixelsPerMm = Math.hypot(matrix.a, matrix.b)

  return (
    <div style={{ position: "relative" }}>
      {children}
      <svg
        data-testid="local-skew-overlay"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: zIndexMap.localSkewOverlay,
        }}
      >
        {pairs.flatMap((pair) =>
          [pair.positive, pair.negative].flatMap((trace) =>
            trace.segments.map((segment, index) => {
              const start = applyToPoint(matrix, segment.start)
              const end = applyToPoint(matrix, segment.end)
              return (
                <line
                  key={`${trace.pcb_trace_id}-${index}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={skewColor({
                    skew: segment.skew,
                    fullScale: pair.max_length_skew ?? pair.max_skew,
                  })}
                  strokeWidth={Math.max(
                    MIN_STROKE_PIXELS,
                    segment.width * pixelsPerMm * OVERLAY_WIDTH_FACTOR,
                  )}
                  strokeLinecap="round"
                  style={{ pointerEvents: "stroke" }}
                  onMouseEnter={() =>
                    setHovered({
                      pair,
                      segment,
                      x: (start.x + end.x) / 2,
                      y: (start.y + end.y) / 2,
                    })
                  }
                  onMouseLeave={() => setHovered(null)}
                />
              )
            }),
          ),
        )}
      </svg>
      {hovered && (
        <div
          style={{
            position: "absolute",
            left: hovered.x + 12,
            top: hovered.y + 12,
            zIndex: zIndexMap.localSkewOverlay,
            pointerEvents: "none",
            background: "#222",
            color: "#eee",
            border: "1px solid #555",
            borderRadius: 4,
            padding: "4px 6px",
            font: "12px sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          {describeHoveredSkew(hovered)}
        </div>
      )}
    </div>
  )
}

/** The hover readout, e.g. "USB local skew +1.236 mm, max 1.236 mm (limit 0.100 mm)". */
function describeHoveredSkew({ pair, segment }: HoveredSkew): string {
  let localSkew = "unknown (traces not coupled)"
  if (segment.skew !== null) localSkew = formatSignedMm(segment.skew)

  let description = `${pair.name ?? "Pair"} local skew ${localSkew}, max ${pair.max_skew.toFixed(3)} mm`
  if (pair.max_length_skew !== undefined) {
    description += ` (limit ${pair.max_length_skew.toFixed(3)} mm)`
  }
  return description
}

/** Formats a skew in mm with an explicit sign. */
function formatSignedMm(skew: number): string {
  let sign = ""
  if (skew > 0) sign = "+"
  return `${sign}${skew.toFixed(3)} mm`
}
