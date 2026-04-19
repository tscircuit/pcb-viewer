import React, { useRef, Fragment } from "react"
import { css } from "@emotion/css"
import type { AnyCircuitElement, PcbTraceError } from "circuit-json"
import { zIndexMap } from "lib/util/z-index-map"
import { type Matrix, applyToPoint, identity } from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import { getPopupPosition } from "lib/util/getPopupPosition"
import type { PcbViaClearanceError } from "circuit-json"
import { findErrorElementById, getErrorId } from "lib/util/get-error-id"
import {
  buildErrorPreviewElementIndexes,
  getErrorFocusPoint,
} from "lib/util/error-preview"
import { FocusMarkerSVG } from "./FocusMarkerSVG"

interface Props {
  transform?: Matrix
  elements?: AnyCircuitElement[]
  children: React.ReactNode
}

interface ErrorMarkerSVGProps {
  errorCenter: { x: number; y: number }
  isHighlighted?: boolean
}

const ErrorMarkerSVG = ({
  errorCenter,
  isHighlighted = false,
}: ErrorMarkerSVGProps) => (
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
    <rect
      x={errorCenter.x - 7}
      y={errorCenter.y - 7}
      width={14}
      height={14}
      transform={`rotate(45 ${errorCenter.x} ${errorCenter.y})`}
      fill={isHighlighted ? "#ff4444" : "transparent"}
      stroke={isHighlighted ? "#ff4444" : "red"}
      strokeWidth={isHighlighted ? 2.5 : 1.5}
    />
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
    (el): el is PcbTraceError =>
      el.type === "pcb_trace_error" &&
      !el.message?.includes("Multiple components found with name"),
  )
  const viaClearanceErrors = elements.filter(
    (el): el is PcbViaClearanceError => el.type === "pcb_via_clearance_error",
  )

  const componentErrors = elements.filter(
    (el): el is PcbTraceError =>
      el.type === "pcb_trace_error" &&
      el.message?.includes("Multiple components found with name"),
  )

  const elementIndexes = buildErrorPreviewElementIndexes(elements)

  const focusedErrorElement = findErrorElementById(elements, activeErrorId)
  const getScreenErrorCenter = (error: AnyCircuitElement) => {
    const focusCenter = getErrorFocusPoint({
      error,
      indexes: elementIndexes,
    })

    if (
      !focusCenter ||
      typeof focusCenter.x !== "number" ||
      typeof focusCenter.y !== "number"
    ) {
      return null
    }

    const screenCenter = applyToPoint(transform, focusCenter as any) as any

    if (Number.isNaN(screenCenter.x) || Number.isNaN(screenCenter.y)) {
      return null
    }

    return screenCenter as { x: number; y: number }
  }

  let focusScreenCenter: { x: number; y: number } | null = null
  if (focusedErrorElement) {
    focusScreenCenter = getScreenErrorCenter(
      focusedErrorElement as AnyCircuitElement,
    )
  }

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      {children}
      {traceErrors.map((el: PcbTraceError, index) => {
        const errorId = getErrorId(el, index)
        const isHighlighted = activeErrorId === errorId

        if (!isHighlighted && !isShowingDRCErrors) return null

        const errorCenter = getScreenErrorCenter(el)
        if (!errorCenter) return null

        const popupPosition = getPopupPosition(errorCenter, containerRef)

        return (
          <Fragment key={errorId}>
            <ErrorMarkerSVG
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
                zIndex: isHighlighted ? 200 : 100,
                left: popupPosition.left,
                top: popupPosition.top,
                color: isHighlighted ? "#ff4444" : "red",
                textAlign: "center",
                fontFamily: "sans-serif",
                fontSize: 12,
                display: isShowingDRCErrors || isHighlighted ? "flex" : "none",
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
      {viaClearanceErrors.map((el, index) => {
        const errorId = getErrorId(el, index)
        const isHighlighted = activeErrorId === errorId

        if (!isHighlighted && !isShowingDRCErrors) return null

        const errorCenter = getScreenErrorCenter(el)
        if (!errorCenter) return null

        const popupPosition = getPopupPosition(
          { x: errorCenter.x, y: errorCenter.y },
          containerRef,
        )

        return (
          <Fragment key={errorId}>
            <ErrorMarkerSVG
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
