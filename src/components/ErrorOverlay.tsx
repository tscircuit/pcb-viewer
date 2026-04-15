import React, { useRef, Fragment } from "react"
import { css } from "@emotion/css"
import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbPort, PcbTraceError } from "circuit-json"
import { zIndexMap } from "lib/util/z-index-map"
import { type Matrix, applyToPoint, identity } from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import { getPopupPosition } from "lib/util/getPopupPosition"
import type { PcbViaClearanceError } from "circuit-json"
import { getErrorId } from "lib/util/get-error-id"

interface Props {
  transform?: Matrix
  elements?: AnyCircuitElement[]
  children: React.ReactNode
}

interface ErrorSVGProps {
  screenPort1: { x: number; y: number }
  screenPort2: { x: number; y: number }
  errorCenter: { x: number; y: number }
  canLineBeDrawn: boolean
  isHighlighted?: boolean
}

interface RouteSVGProps {
  points: { x: number; y: number }[]
  errorCenter: { x: number; y: number }
  isHighlighted?: boolean
}

const FocusMarkerSVG = ({
  center,
}: {
  center: { x: number; y: number }
}) => (
  <svg
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      pointerEvents: "none",
      mixBlendMode: "difference",
      zIndex: zIndexMap.errorOverlay + 30,
    }}
    width="100%"
    height="100%"
  >
    <circle
      cx={center.x}
      cy={center.y}
      r={11}
      fill="none"
      stroke="#ff6b6b"
      strokeWidth={2.5}
      opacity={0.95}
    />
    <circle cx={center.x} cy={center.y} r={4.5} fill="#ff6b6b" opacity={0.95} />
    <line
      x1={center.x - 18}
      y1={center.y}
      x2={center.x - 8}
      y2={center.y}
      stroke="#ff6b6b"
      strokeWidth={2}
    />
    <line
      x1={center.x + 8}
      y1={center.y}
      x2={center.x + 18}
      y2={center.y}
      stroke="#ff6b6b"
      strokeWidth={2}
    />
    <line
      x1={center.x}
      y1={center.y - 18}
      x2={center.x}
      y2={center.y - 8}
      stroke="#ff6b6b"
      strokeWidth={2}
    />
    <line
      x1={center.x}
      y1={center.y + 8}
      x2={center.x}
      y2={center.y + 18}
      stroke="#ff6b6b"
      strokeWidth={2}
    />
  </svg>
)

const ErrorSVG = ({
  screenPort1,
  screenPort2,
  errorCenter,
  canLineBeDrawn,
  isHighlighted = false,
}: ErrorSVGProps) => (
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
}: RouteSVGProps) => (
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

export const ErrorOverlay = ({
  children,
  transform = identity(),
  elements,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const { isShowingDRCErrors, hoveredErrorId, focusedErrorId } = useGlobalStore(
    (state) => ({
      isShowingDRCErrors: state.is_showing_drc_errors,
      hoveredErrorId: state.hovered_error_id,
      focusedErrorId: state.focused_error_id,
    }),
  )
  const activeErrorId = focusedErrorId ?? hoveredErrorId

  if (!elements) {
    return (
      <div style={{ position: "relative" }} ref={containerRef}>
        {children}
      </div>
    )
  }

  const traceErrors = elements.filter(
    (el): el is PcbTraceError => el.type === "pcb_trace_error",
  )
  const viaClearanceErrors = elements.filter(
    (el): el is PcbViaClearanceError => el.type === "pcb_via_clearance_error",
  )

  const componentErrors = elements.filter(
    (el): el is PcbTraceError =>
      el.type === "pcb_trace_error" &&
      el.message?.includes("Multiple components found with name"),
  )

  const portsMap = new Map<string, PcbPort>()
  const viasMap = new Map<string, any>()
  const componentsMap = new Map<string, any>()
  const tracesMap = new Map<string, any>()
  elements.forEach((el) => {
    if (el.type === "pcb_port") {
      portsMap.set(el.pcb_port_id, el as PcbPort)
    } else if (el.type === "pcb_via") {
      viasMap.set(el.pcb_via_id, el)
    } else if (el.type === "pcb_component") {
      componentsMap.set(el.pcb_component_id, el)
    } else if (el.type === "pcb_trace") {
      tracesMap.set(el.pcb_trace_id, el)
    }
  })

  const focusedErrorElement = elements.find((el, index) => {
    if (!el.type.includes("error")) return false
    return getErrorId(el, index) === activeErrorId
  }) as any

  let focusScreenCenter: { x: number; y: number } | null = null
  if (focusedErrorElement) {
    let focusCenter =
      focusedErrorElement.center ||
      focusedErrorElement.pcb_center ||
      focusedErrorElement.component_center ||
      null

    if (!focusCenter && focusedErrorElement.pcb_via_ids?.length) {
      const vias = focusedErrorElement.pcb_via_ids
        .map((pcbViaId: string) => viasMap.get(pcbViaId))
        .filter(Boolean)
      if (vias.length > 0) {
        focusCenter = {
          x:
            vias.reduce((sum: number, via: any) => sum + via.x, 0) /
            vias.length,
          y:
            vias.reduce((sum: number, via: any) => sum + via.y, 0) /
            vias.length,
        }
      }
    }

    if (!focusCenter && focusedErrorElement.pcb_component_id) {
      focusCenter = componentsMap.get(
        focusedErrorElement.pcb_component_id,
      )?.center
    }

    if (!focusCenter && focusedErrorElement.pcb_port_ids?.length) {
      const ports = focusedErrorElement.pcb_port_ids
        .map((pcbPortId: string) => portsMap.get(pcbPortId))
        .filter(Boolean)
      if (ports.length > 0) {
        focusCenter = {
          x:
            ports.reduce((sum: number, port: any) => sum + port.x, 0) /
            ports.length,
          y:
            ports.reduce((sum: number, port: any) => sum + port.y, 0) /
            ports.length,
        }
      }
    }

    if (!focusCenter && focusedErrorElement.pcb_trace_id) {
      const trace = tracesMap.get(focusedErrorElement.pcb_trace_id)
      if (trace?.route?.length) {
        const mid = Math.floor(trace.route.length / 2)
        const routePoint = trace.route[mid] as any
        focusCenter = { x: routePoint.x, y: routePoint.y }
      }
    }

    if (
      focusCenter &&
      typeof focusCenter.x === "number" &&
      typeof focusCenter.y === "number"
    ) {
      const screenCenter = applyToPoint(transform, focusCenter as any) as any
      if (!isNaN(screenCenter.x) && !isNaN(screenCenter.y)) {
        focusScreenCenter = screenCenter
      }
    }
  }

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

        const errorId = getErrorId(el, index)
        const isHighlighted = activeErrorId === errorId

        if (port1 && port2) {
          const screenPort1 = applyToPoint(transform, {
            x: port1.x,
            y: port1.y,
          })
          const screenPort2 = applyToPoint(transform, {
            x: port2.x,
            y: port2.y,
          })

          if (!isShowingDRCErrors) {
            return null
          }

          const canLineBeDrawn = !(
            Number.isNaN(screenPort1.x) ||
            Number.isNaN(screenPort1.y) ||
            Number.isNaN(screenPort2.x) ||
            Number.isNaN(screenPort2.y)
          )

          const errorCenter = {
            x: (screenPort1.x + screenPort2.x) / 2,
            y: (screenPort1.y + screenPort2.y) / 2,
          }

          if (Number.isNaN(errorCenter.x) || Number.isNaN(errorCenter.y)) {
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
                  left: errorCenter.x - 15,
                  top: errorCenter.y - 15,
                  width: 30,
                  height: 30,
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
        }
        if (trace?.route && (isShowingDRCErrors || isHighlighted)) {
          const screenPoints = trace.route.map((pt) =>
            applyToPoint(transform, { x: pt.x, y: pt.y }),
          )
          if (
            screenPoints.some((pt) => Number.isNaN(pt.x) || Number.isNaN(pt.y))
          )
            return null
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
                  left: errorCenter.x - 15,
                  top: errorCenter.y - 15,
                  width: 30,
                  height: 30,
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
        }

        return null
      })}
      {viaClearanceErrors.map((el, index) => {
        if (!el.pcb_center) return null

        const errorId = getErrorId(el, index)
        const isHighlighted = activeErrorId === errorId

        if (!isHighlighted && !isShowingDRCErrors) return null

        const errorCenter = applyToPoint(transform, {
          x: el.pcb_center.x!,
          y: el.pcb_center.y!,
        })
        if (Number.isNaN(errorCenter.x) || Number.isNaN(errorCenter.y))
          return null

        const popupPosition = getPopupPosition(
          { x: errorCenter.x, y: errorCenter.y },
          containerRef,
        )

        return (
          <Fragment key={errorId}>
            <RouteSVG
              points={[]}
              errorCenter={errorCenter}
              isHighlighted={isHighlighted}
            />
            <div
              style={{
                position: "absolute",
                left: errorCenter.x - 15,
                top: errorCenter.y - 15,
                width: 30,
                height: 30,
                zIndex: zIndexMap.errorOverlay + 5,
                cursor: "pointer",
                borderRadius: "50%",
              }}
              onMouseEnter={(e) => {
                const popup = e.currentTarget.nextElementSibling as HTMLElement
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

        const errorId = getErrorId(el, index)
        const isHighlighted = activeErrorId === errorId

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
          if (Number.isNaN(screenCenter.x) || Number.isNaN(screenCenter.y))
            return null

          const scale = Math.abs(transform.a)
          const baseRadius = 0.5
          const minRadius = 8
          const maxRadius = 30
          const scaledRadius = Math.max(
            minRadius,
            Math.min(maxRadius, baseRadius * scale),
          )

          const popupPosition = getPopupPosition(screenCenter, containerRef)

          return (
            <Fragment key={errorId}>
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
                    points={`${screenCenter.x},${screenCenter.y - scaledRadius * 1.25} ${screenCenter.x + scaledRadius},${screenCenter.y} ${screenCenter.x},${screenCenter.y + scaledRadius * 1.25} ${screenCenter.x - scaledRadius},${screenCenter.y}`}
                    fill="#ff4444"
                  />
                ) : (
                  <circle
                    cx={screenCenter.x}
                    cy={screenCenter.y}
                    r={scaledRadius}
                    fill="none"
                    stroke={isHighlighted ? "#ff4444" : "red"}
                    strokeWidth={
                      isHighlighted
                        ? Math.max(2, scaledRadius * 0.15)
                        : Math.max(1, scaledRadius * 0.1)
                    }
                    opacity={1}
                  />
                )}
              </svg>

              <div
                style={{
                  position: "absolute",
                  left: screenCenter.x - (scaledRadius + 10),
                  top: screenCenter.y - (scaledRadius + 10),
                  width: (scaledRadius + 10) * 2,
                  height: (scaledRadius + 10) * 2,
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
      {focusScreenCenter && <FocusMarkerSVG center={focusScreenCenter} />}
    </div>
  )
}
