import { css } from "@emotion/css"
import { AnySoupElement, PCBPort, PCBTraceError } from "@tscircuit/builder"
import { useEffect, useRef, useState } from "react"
import { Matrix, applyToPoint, identity, inverse } from "transformation-matrix"

interface Props {
  transform?: Matrix
  elements?: AnySoupElement[]
  children: any
}

export const ErrorOverlay = ({ children, transform, elements }: Props) => {
  if (!transform) transform = identity()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const containerBounds = containerRef?.current?.getBoundingClientRect()

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      {children}
      {elements
        ?.filter((el): el is PCBTraceError => el.type === "pcb_error")
        .map((el: PCBTraceError) => {
          const { pcb_port_ids } = el

          const port1: PCBPort = elements.find(
            (el) =>
              el.type === "pcb_port" && el.pcb_port_id === pcb_port_ids?.[0]
          )
          const port2: PCBPort = elements.find(
            (el) =>
              el.type === "pcb_port" && el.pcb_port_id === pcb_port_ids?.[1]
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

          const midPoint = {
            x: (screenPort1.x + screenPort2.x) / 2,
            y: (screenPort1.y + screenPort2.y) / 2,
          }

          if (isNaN(midPoint.x) || isNaN(midPoint.y)) {
            midPoint.x = isNaN(screenPort1.x) ? screenPort2.x : screenPort1.x
            midPoint.y = isNaN(screenPort1.y) ? screenPort2.y : screenPort1.y
          }
          if (isNaN(midPoint.x) || isNaN(midPoint.y)) {
            return null
          }

          return (
            <>
              <svg
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  pointerEvents: "none",
                  mixBlendMode: "difference",
                  zIndex: 1000,
                }}
                width={containerBounds?.width}
                height={containerBounds?.height}
              >
                {canLineBeDrawn && (
                  <line
                    x1={screenPort1.x}
                    y1={screenPort1.y}
                    x2={screenPort2.x}
                    y2={screenPort2.y}
                    markerEnd="url(#head)"
                    strokeWidth={1.5}
                    strokeDasharray={"2,2"}
                    fill="none"
                    stroke="red"
                  />
                )}
              </svg>
              <div
                className={css`
                  position: absolute;
                  z-index: 1000;
                  left: ${midPoint.x}px;
                  top: ${midPoint.y}px;
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
