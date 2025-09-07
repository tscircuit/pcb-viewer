import { css } from "@emotion/css"
import { su } from "@tscircuit/soup-util"
import type { AnyCircuitElement, PcbPort, PcbTraceError } from "circuit-json"
import { zIndexMap } from "lib/util/z-index-map"
import { useRef, Fragment, useMemo } from "react"
import { type Matrix, applyToPoint, identity } from "transformation-matrix"
import { useGlobalStore } from "../global-store"
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
        {isHighlighted ? (
          <rect
            x={errorCenter.x - 7}
            y={errorCenter.y - 7}
            width={14}
            height={14}
            transform={`rotate(45 ${errorCenter.x} ${errorCenter.y})`}
            fill="#ff4444"
          />
        ) : (
          <circle cx={errorCenter.x} cy={errorCenter.y} r={5} fill="red" />
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
    {isHighlighted ? (
      <rect
        x={errorCenter.x - 7}
        y={errorCenter.y - 7}
        width={14}
        height={14}
        transform={`rotate(45 ${errorCenter.x} ${errorCenter.y})`}
        fill="#ff4444"
      />
    ) : (
      <circle cx={errorCenter.x} cy={errorCenter.y} r={5} fill="red" />
    )}
  </svg>
)

const errorMessageStyles = css`
  opacity: 0;
  pointer-events: none;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 8px 12px;
  border-radius: 4px;
  width: 200px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  word-wrap: break-word;
  line-height: 1.4;
  transition: opacity 0.2s;
  margin-bottom: 10px;
  color: red;
`

export const ErrorOverlay = ({ children, transform, elements }: Props) => {
  if (!transform) transform = identity()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isShowingDRCErrors = useGlobalStore(
    (state) => state.is_showing_drc_errors,
  )
  const hoveredErrorId = useGlobalStore((state) => state.hovered_error_id)

  const traceErrors = useMemo(
    () =>
      elements?.filter(
        (el): el is PcbTraceError => el.type === "pcb_trace_error",
      ) || [],
    [elements],
  )

  const componentErrors = useMemo(
    () =>
      elements?.filter(
        (el): el is any =>
          el.type === "pcb_trace_error" &&
          el.message?.includes("Multiple components found with name"),
      ) || [],
    [elements],
  )

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
              </div>
            </Fragment>
          )
        }
        // fallback: only show if global DRC errors enabled and route exists
        if (trace?.route && (isShowingDRCErrors || isHighlighted)) {
          const screenPoints = trace.route.map((pt) =>
            applyToPoint(transform, { x: pt.x, y: pt.y }),
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
              </div>
            </Fragment>
          )
        }

        return null
      })}
      {componentErrors.map((el: any, index) => {
        const componentName =
          el.component_name || el.message?.match(/name "([^"]+)"/)?.[1]
        if (!componentName) return null

        const components =
          elements?.filter(
            (comp) =>
              (comp.type === "source_component" &&
                comp.name === componentName) ||
              (comp.type === "pcb_component" &&
                elements?.find(
                  (src) =>
                    src.type === "source_component" &&
                    src.source_component_id === comp.source_component_id &&
                    src.name === componentName,
                )),
          ) || []

        const errorId =
          el.pcb_trace_error_id ||
          `error_${index}_${el.error_type}_${el.message?.slice(0, 20)}`
        const isHighlighted = hoveredErrorId === errorId

        if (!isHighlighted && !isShowingDRCErrors) return null

        return components.map((comp, compIndex) => {
          let center = { x: 0, y: 0 }

          if (comp.type === "pcb_component") {
            center = comp.center || { x: 0, y: 0 }
          } else if (comp.type === "source_component") {
            const pcbComp = elements?.find(
              (pc) =>
                pc.type === "pcb_component" &&
                pc.source_component_id === comp.source_component_id,
            )
            if (pcbComp && pcbComp.type === "pcb_component")
              center = pcbComp.center || { x: 0, y: 0 }
          }

          const screenCenter = applyToPoint(transform, center)
          if (isNaN(screenCenter.x) || isNaN(screenCenter.y)) return null

          const popupPosition = getPopupPosition(screenCenter, containerRef)

          return (
            <Fragment key={`${errorId}_${compIndex}`}>
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
                {isHighlighted ? (
                  <polygon
                    points={`${screenCenter.x},${screenCenter.y - 25} ${screenCenter.x + 20},${screenCenter.y} ${screenCenter.x},${screenCenter.y + 25} ${screenCenter.x - 20},${screenCenter.y}`}
                    fill="#ff4444"
                  />
                ) : (
                  <circle
                    cx={screenCenter.x}
                    cy={screenCenter.y}
                    r={20}
                    fill="none"
                    stroke={"red"}
                    strokeWidth={isHighlighted ? 6 : 4}
                    opacity={1}
                  />
                )}
              </svg>
              {/* Invisible hover area around the circle */}
              <div
                style={{
                  position: "absolute",
                  left: screenCenter.x - 30,
                  top: screenCenter.y - 30,
                  width: 60,
                  height: 60,
                  zIndex: zIndexMap.errorOverlay + 5,
                  cursor: "pointer",
                  borderRadius: "50%",
                }}
                onMouseEnter={(e) => {
                  const popup = e.currentTarget
                    .nextElementSibling as HTMLElement
                  if (popup) {
                    const msg = popup.querySelector(
                      ".error-message",
                    ) as HTMLElement
                    if (msg) msg.style.opacity = "1"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isHighlighted) {
                    const popup = e.currentTarget
                      .nextElementSibling as HTMLElement
                    if (popup) {
                      const msg = popup.querySelector(
                        ".error-message",
                      ) as HTMLElement
                      if (msg) msg.style.opacity = "0"
                    }
                  }
                }}
              />
              <div
                style={{
                  position: "absolute",
                  zIndex: isHighlighted
                    ? zIndexMap.errorOverlay + 20
                    : zIndexMap.errorOverlay + 10,
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
                  pointerEvents: "none",
                  transform: popupPosition.transform,
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
              </div>
            </Fragment>
          )
        })
      })}
    </div>
  )
}
