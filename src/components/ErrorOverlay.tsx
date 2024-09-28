import { css } from "@emotion/css"
import type { AnyCircuitElement, PcbPort, PcbTraceError } from "circuit-json"
import { useRef } from "react"
import { type Matrix, applyToPoint, identity } from "transformation-matrix"

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
      zIndex: 1000,
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

export const ErrorOverlay = ({ children, transform, elements }: Props) => {
  if (!transform) transform = identity()
  const containerRef = useRef<HTMLDivElement | null>(null)

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      {children}
      {elements
        ?.filter((el): el is PcbTraceError => el.type === "pcb_trace_error")
        .map((el: PcbTraceError) => {
          const { pcb_port_ids } = el

          const port1 = elements.find(
            (el): el is PcbPort =>
              el.type === "pcb_port" && el.pcb_port_id === pcb_port_ids?.[0],
          )
          const port2 = elements.find(
            (el): el is PcbPort =>
              el.type === "pcb_port" && el.pcb_port_id === pcb_port_ids?.[1],
          )

          if (!port1 || !port2) return null

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
        })}
    </div>
  )
}
