import { css } from "@emotion/css"
import { su } from "@tscircuit/soup-util"
import type { AnyCircuitElement, PcbPort, PcbTraceError } from "circuit-json"
import { zIndexMap } from "lib/util/z-index-map"
import { useRef } from "react"
import { type Matrix, applyToPoint, identity } from "transformation-matrix"
import { useGlobalStore } from "global-store" // adjust the import path as needed

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
          strokeWidth={1.5}
          strokeDasharray="2,2"
          stroke="red"
        />
        <line
          x1={errorCenter.x}
          y1={errorCenter.y}
          x2={screenPort2.x}
          y2={screenPort2.y}
          strokeWidth={1.5}
          strokeDasharray="2,2"
          stroke="red"
        />
        <rect
          x={errorCenter.x - 5}
          y={errorCenter.y - 5}
          width={10}
          height={10}
          transform={`rotate(45 ${errorCenter.x} ${errorCenter.y})`}
          fill="red"
        />
      </>
    )}
  </svg>
)

const RouteSVG = ({
  points,
  errorCenter,
}: {
  points: { x: number; y: number }[]
  errorCenter: { x: number; y: number }
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
        stroke="red"
        strokeWidth={1.5}
        strokeDasharray="2,2"
      />
    )}
    <rect
      x={errorCenter.x - 5}
      y={errorCenter.y - 5}
      width={10}
      height={10}
      transform={`rotate(45 ${errorCenter.x} ${errorCenter.y})`}
      fill="red"
    />
  </svg>
)

export const ErrorOverlay = ({ children, transform, elements }: Props) => {
  if (!transform) transform = identity()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isShowingDRCErrors = useGlobalStore(
    (state) => state.is_showing_drc_errors,
  )

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      {children}
      {elements
        ?.filter((el): el is PcbTraceError => el.type === "pcb_trace_error")
        .map((el: PcbTraceError) => {
          const { pcb_port_ids, pcb_trace_id } = el
          const port1 = elements.find(
            (el): el is PcbPort =>
              el.type === "pcb_port" && el.pcb_port_id === pcb_port_ids?.[0],
          )
          const port2 = elements.find(
            (el): el is PcbPort =>
              el.type === "pcb_port" && el.pcb_port_id === pcb_port_ids?.[1],
          )
          const trace = su(elements).pcb_trace.get(pcb_trace_id)

          // port-based errors always show
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

            return (
              <>
                <ErrorSVG
                  screenPort1={screenPort1}
                  screenPort2={screenPort2}
                  errorCenter={errorCenter}
                  canLineBeDrawn={canLineBeDrawn}
                />
                <div
                  className={css`
                  position: absolute;
                  z-index: 100;
                  left: ${errorCenter.x}px;
                  top: ${errorCenter.y}px;
                  color: red;
                  text-align: center;
                  font-family: sans-serif;
                  font-size: 12px;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  cursor: pointer;
                  transform: translate(-50%, -100%);

                  & .error-message {
                    opacity: 0;
                    pointer-events: none;

                    width: 200px;
                    transition: opacity 0.2s;
                    margin-bottom: 10px;
                  }

                  &:hover .error-message {
                    opacity: 1;
                    display: flex;
                  }
                `}
                >
                  <div className="error-message">{el.message}</div>
                  <div
                    className={css`
                    width: 10px;
                    height: 10px;
                    transform: translate(0, 5px) rotate(45deg);
                    background-color: red;
                  `}
                  />
                </div>
              </>
            )
          }
          // fallback: only show if global DRC errors enabled and route exists
          if (trace?.route && isShowingDRCErrors) {
            const screenPoints = trace.route.map((pt) =>
              applyToPoint(transform!, { x: pt.x, y: pt.y }),
            )
            if (screenPoints.some((pt) => isNaN(pt.x) || isNaN(pt.y)))
              return null
            const mid = Math.floor(screenPoints.length / 2)
            const errorCenter = screenPoints[mid]
            return (
              <>
                <RouteSVG points={screenPoints} errorCenter={errorCenter} />
                <div
                  className={css`
                    position: absolute;
                    z-index: ${zIndexMap.errorOverlay + 1};
                    left: ${errorCenter.x}px;
                    top: ${errorCenter.y}px;
                    color: red;
                    text-align: center;
                    font-family: sans-serif;
                    font-size: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                    transform: translate(-50%, -100%);

                    & .error-message { opacity: 0; pointer-events: none; width: 200px; transition: opacity 0.2s; margin-bottom: 10px; }
                    &:hover .error-message { opacity: 1; display: flex; }
                  `}
                >
                  <div className="error-message">{el.message}</div>
                  <div
                    className={css`
                      width: 10px;
                      height: 10px;
                      transform: translate(0, 5px) rotate(45deg);
                      background-color: red;
                    `}
                  />
                </div>
              </>
            )
          }

          return null
        })}
    </div>
  )
}
