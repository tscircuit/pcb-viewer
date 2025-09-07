import { css } from "@emotion/css"
import { su } from "@tscircuit/soup-util"
import type { AnyCircuitElement, PcbPort, PcbTraceError } from "circuit-json"
import { zIndexMap } from "lib/util/z-index-map"
import { useRef, Fragment, useMemo } from "react"
import { type Matrix, applyToPoint, identity } from "transformation-matrix"
import { useGlobalStore } from "../global-store" // adjust the import path as needed
import { getPopupPosition } from "lib/util/getPopupPosition"

interface Props {
  transform?: Matrix
  elements?: AnyCircuitElement[]
  children: any
}

const ErrorSVG = ({
  screenPort1,
  screenPort2,
  errorCenter,
  canLineBeDrawn,
  isHighlighted = false,
}: any) => (
  <svg
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      pointerEvents: "none",
      mixBlendMode: "difference",
      zIndex: zIndexMap.errorOverlay,
    }}
    width="100%"
    height="100%"
  >
    {canLineBeDrawn && (
      <>
        <line
          x1={screenPort1.x}
          y1={screenPort1.y}
          x2={errorCenter.x}
          y2={errorCenter.y}
          strokeWidth={isHighlighted ? 3 : 1.5}
          strokeDasharray="2,2"
          stroke={isHighlighted ? "#ff4444" : "red"}
        />
        <line
          x1={errorCenter.x}
          y1={errorCenter.y}
          x2={screenPort2.x}
          y2={screenPort2.y}
          strokeWidth={isHighlighted ? 3 : 1.5}
          strokeDasharray="2,2"
          stroke={isHighlighted ? "#ff4444" : "red"}
        />
        <rect
          x={errorCenter.x - (isHighlighted ? 7 : 5)}
          y={errorCenter.y - (isHighlighted ? 7 : 5)}
          width={isHighlighted ? 14 : 10}
          height={isHighlighted ? 14 : 10}
          transform={`rotate(45 ${errorCenter.x} ${errorCenter.y})`}
          fill={isHighlighted ? "#ff4444" : "red"}
        />
        {isHighlighted && (
          <circle
            cx={errorCenter.x}
            cy={errorCenter.y}
            r={15}
            fill="none"
            stroke="#ff4444"
            strokeWidth={2}
            opacity={0.6}
          />
        )}
      </>
    )}
  </svg>
)

const RouteSVG = ({
  points,
  errorCenter,
  isHighlighted = false,
}: {
  points: { x: number; y: number }[]
  errorCenter: { x: number; y: number }
  isHighlighted?: boolean
}) => (
  <svg
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      pointerEvents: "none",
      mixBlendMode: "difference",
      zIndex: zIndexMap.errorOverlay,
    }}
    width="100%"
    height="100%"
  >
    {points.length > 1 && (
      <polyline
        points={points.map((pt) => `${pt.x},${pt.y}`).join(" ")}
        fill="none"
        stroke={isHighlighted ? "#ff4444" : "red"}
        strokeWidth={isHighlighted ? 3 : 1.5}
        strokeDasharray="2,2"
      />
    )}
    <rect
      x={errorCenter.x - (isHighlighted ? 7 : 5)}
      y={errorCenter.y - (isHighlighted ? 7 : 5)}
      width={isHighlighted ? 14 : 10}
      height={isHighlighted ? 14 : 10}
      transform={`rotate(45 ${errorCenter.x} ${errorCenter.y})`}
      fill={isHighlighted ? "#ff4444" : "red"}
    />
    {isHighlighted && (
      <circle
        cx={errorCenter.x}
        cy={errorCenter.y}
        r={15}
        fill="none"
        stroke="#ff4444"
        strokeWidth={2}
        opacity={0.6}
      />
    )}
  </svg>
)

// Pre-computed styles to avoid recreation on every render
const errorMessageStyles = css`
  opacity: 0;
  pointer-events: none;
  background-color: rgba(0, 0, 0, 0.9);
  padding: 8px 12px;
  border-radius: 4px;
  width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  word-wrap: break-word;
  line-height: 1.4;
  transition: opacity 0.2s;
  margin-bottom: 10px;
`

const errorMarkerStyles = css`
  transform: translate(0, 5px) rotate(45deg);
`

export const ErrorOverlay = ({ children, transform, elements }: Props) => {
  if (!transform) transform = identity()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isShowingDRCErrors = useGlobalStore(
    (state) => state.is_showing_drc_errors,
  )
  const hoveredErrorId = useGlobalStore((state) => state.hovered_error_id)

  // Memoize filtered errors to avoid recalculation
  const traceErrors = useMemo(
    () =>
      elements?.filter(
        (el): el is PcbTraceError => el.type === "pcb_trace_error",
      ) || [],
    [elements],
  )

  // Memoize ports lookup for better performance
  const portsMap = useMemo(() => {
    const map = new Map<string, PcbPort>()
    elements?.forEach((el) => {
      if (el.type === "pcb_port") {
        map.set(el.pcb_port_id, el as PcbPort)
      }
    })
    return map
  }, [elements])

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      {children}
      {traceErrors.map((el: PcbTraceError, index) => {
        const { pcb_port_ids, pcb_trace_id } = el
        const port1 = pcb_port_ids?.[0]
          ? portsMap.get(pcb_port_ids[0])
          : undefined
        const port2 = pcb_port_ids?.[1]
          ? portsMap.get(pcb_port_ids[1])
          : undefined
        const trace = elements
          ? su(elements).pcb_trace.get(pcb_trace_id)
          : undefined

        // Create consistent error ID matching the one in ToolbarOverlay
        const errorId =
          el.pcb_trace_error_id ||
          `error_${index}_${el.error_type}_${el.message?.slice(0, 20)}`
        const isHighlighted = hoveredErrorId === errorId

        // port-based errors
        if (port1 && port2) {
          const screenPort1 = applyToPoint(transform, {
            x: port1.x,
            y: port1.y,
          })
          const screenPort2 = applyToPoint(transform, {
            x: port2.x,
            y: port2.y,
          })

          const canLineBeDrawn = !(
            isNaN(screenPort1.x) ||
            isNaN(screenPort1.y) ||
            isNaN(screenPort2.x) ||
            isNaN(screenPort2.y)
          )

          const errorCenter = {
            x: (screenPort1.x + screenPort2.x) / 2,
            y: (screenPort1.y + screenPort2.y) / 2,
          }

          if (isNaN(errorCenter.x) || isNaN(errorCenter.y)) {
            return null
          }

          const popupPosition = getPopupPosition(errorCenter, containerRef)

          return (
            <Fragment key={errorId}>
              <ErrorSVG
                screenPort1={screenPort1}
                screenPort2={screenPort2}
                errorCenter={errorCenter}
                canLineBeDrawn={canLineBeDrawn}
                isHighlighted={isHighlighted}
              />
              <div
                style={{
                  position: "absolute",
                  zIndex: isHighlighted ? 200 : 100,
                  left: popupPosition.left,
                  top: popupPosition.top,
                  color: isHighlighted ? "#ff4444" : "red",
                  textAlign: "center",
                  fontFamily: "sans-serif",
                  fontSize: 12,
                  display:
                    isShowingDRCErrors || isHighlighted ? "flex" : "none",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  transform: popupPosition.transform,
                }}
                onMouseEnter={(e) => {
                  const msg = e.currentTarget.querySelector(
                    ".error-message",
                  ) as HTMLElement
                  if (msg) msg.style.opacity = "1"
                }}
                onMouseLeave={(e) => {
                  const msg = e.currentTarget.querySelector(
                    ".error-message",
                  ) as HTMLElement
                  if (msg && !isHighlighted) msg.style.opacity = "0"
                }}
              >
                <div
                  className={`error-message ${errorMessageStyles}`}
                  style={{
                    opacity: isHighlighted ? 1 : 0,
                    border: `1px solid ${isHighlighted ? "#ff4444" : "red"}`,
                  }}
                >
                  {el.message}
                </div>
                <div
                  className={errorMarkerStyles}
                  style={{
                    width: isHighlighted ? 14 : 10,
                    height: isHighlighted ? 14 : 10,
                    backgroundColor: isHighlighted ? "#ff4444" : "red",
                  }}
                />
              </div>
            </Fragment>
          )
        }
        // fallback: only show if global DRC errors enabled and route exists
        if (trace?.route && (isShowingDRCErrors || isHighlighted)) {
          const screenPoints = trace.route.map((pt) =>
            applyToPoint(transform!, { x: pt.x, y: pt.y }),
          )
          if (screenPoints.some((pt) => isNaN(pt.x) || isNaN(pt.y))) return null
          const mid = Math.floor(screenPoints.length / 2)
          const errorCenter = screenPoints[mid]
          const popupPosition = getPopupPosition(errorCenter, containerRef)

          return (
            <Fragment key={errorId}>
              <RouteSVG
                points={screenPoints}
                errorCenter={errorCenter}
                isHighlighted={isHighlighted}
              />
              <div
                style={{
                  position: "absolute",
                  zIndex: isHighlighted
                    ? zIndexMap.errorOverlay + 10
                    : zIndexMap.errorOverlay + 1,
                  left: popupPosition.left,
                  top: popupPosition.top,
                  color: isHighlighted ? "#ff4444" : "red",
                  textAlign: "center",
                  fontFamily: "sans-serif",
                  fontSize: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  transform: popupPosition.transform,
                }}
                onMouseEnter={(e) => {
                  const msg = e.currentTarget.querySelector(
                    ".error-message",
                  ) as HTMLElement
                  if (msg) msg.style.opacity = "1"
                }}
                onMouseLeave={(e) => {
                  const msg = e.currentTarget.querySelector(
                    ".error-message",
                  ) as HTMLElement
                  if (msg && !isHighlighted) msg.style.opacity = "0"
                }}
              >
                <div
                  className={`error-message ${errorMessageStyles}`}
                  style={{
                    opacity: isHighlighted ? 1 : 0,
                    border: `1px solid ${isHighlighted ? "#ff4444" : "red"}`,
                  }}
                >
                  {el.message}
                </div>
                <div
                  className={errorMarkerStyles}
                  style={{
                    width: isHighlighted ? 14 : 10,
                    height: isHighlighted ? 14 : 10,
                    backgroundColor: isHighlighted ? "#ff4444" : "red",
                  }}
                />
              </div>
            </Fragment>
          )
        }

        return null
      })}
    </div>
  )
}
