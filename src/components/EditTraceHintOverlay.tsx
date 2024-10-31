import type {
  AnyCircuitElement,
  PcbSmtPad,
  PcbTraceHint,
  PcbPlatedHole,
} from "circuit-json"
import { su } from "@tscircuit/soup-util"
import { useGlobalStore } from "global-store"
import { type EditTraceHintEvent } from "lib/edit-events"
import { Fragment, useEffect, useRef, useState } from "react"
import {
  type Matrix,
  applyToPoint,
  identity,
  inverse,
} from "transformation-matrix"
import { HotkeyActionMenu } from "./HotkeyActionMenu"
import { useToast } from "lib/toast"
import {zIndexMap} from "lib/util/z-index-map"

interface Props {
  transform?: Matrix
  children: any
  soup: AnyCircuitElement[]
  disabled?: boolean
  cancelPanDrag: Function
  onCreateEditEvent: (event: EditTraceHintEvent) => void
  onModifyEditEvent: (event: Partial<EditTraceHintEvent>) => void
}

interface Point {
  x: number
  y: number
  trace_width?: number
}

const isInsideOfSmtpad = (
  elm: PcbSmtPad,
  point: { x: number; y: number },
  padding = 0,
) => {
  if (elm.shape === "circle") {
    // Not implemented
    return false
  }
  const halfWidth = elm.width / 2
  const halfHeight = elm.height / 2

  const left = elm.x - halfWidth - padding
  const right = elm.x + halfWidth + padding
  const top = elm.y - halfHeight - padding
  const bottom = elm.y + halfHeight + padding

  return point.x > left && point.x < right && point.y > top && point.y < bottom
}

const isInsideOfPlatedHole = (
  hole: PcbPlatedHole,
  point: { x: number; y: number },
  padding = 0,
) => {
  if (hole.shape === "circle") {
    const distance = Math.sqrt(
      Math.pow(point.x - hole.x, 2) + Math.pow(point.y - hole.y, 2),
    )
    return distance <= hole.outer_diameter / 2 + padding
  } else {
    const halfWidth = hole.hole_width / 2
    const halfHeight = hole.hole_height / 2

    const left = hole.x - halfWidth - padding
    const right = hole.x + halfWidth + padding
    const top = hole.y - halfHeight - padding
    const bottom = hole.y + halfHeight + padding

    return (
      point.x > left && point.x < right && point.y > top && point.y < bottom
    )
  }
}

/**
 * The trace hit overlay allows you to click a pad, after
 * clicking a pad you'll start dragging out a trace.
 *
 * Each time you click, you'll add to the trace hint path.
 *
 * If you click inside any existing hint, you'll stop adding
 * to the trace hint path.
 *
 * If you select an existing hint, you'll start dragging the
 * route hint. Mouse up stops dragging.
 *
 * If you right click on a hint, you'll delete it.
 *
 * If you right click when creating a trace hint, it will
 * place a hint you'll exit adding the trace hint.
 *
 */
export const EditTraceHintOverlay = ({
  children,
  disabled: disabledProp,
  transform,
  soup,
  cancelPanDrag,
  onCreateEditEvent,
  onModifyEditEvent,
}: Props) => {
  if (!transform) transform = identity()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const containerBounds = containerRef.current?.getBoundingClientRect()
  const [selectedElement, setSelectedElement] = useState<
    null | PcbSmtPad | PcbPlatedHole
  >(null)
  const toast = useToast()
  const [dragState, setDragState] = useState<{
    dragStart: { x: number; y: number }
    originalCenter: { x: number; y: number }
    dragEnd: { x: number; y: number }
    editEvent: EditTraceHintEvent
    shouldDrawRouteHint?: boolean
  } | null>(null)
  const [shouldCreateAsVia, setShouldCreateAsVia] = useState(false)
  const isElementSelected = selectedElement !== null
  const in_edit_trace_mode = useGlobalStore((s) => s.in_draw_trace_mode)

  const disabled = disabledProp || !in_edit_trace_mode

  let ogCenterScreen, dragEndScreen
  if (dragState?.originalCenter && dragState?.dragEnd) {
    ogCenterScreen = applyToPoint(transform, dragState?.originalCenter!)
    dragEndScreen = applyToPoint(transform, dragState?.dragEnd!)
  }

  useEffect(() => {
    if (!isElementSelected) return

    function keyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedElement(null)
        setDragState(null)
      }
    }

    window.addEventListener("keydown", keyDown)
    return () => window.removeEventListener("keydown", keyDown)
  }, [isElementSelected])

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        overflow: "hidden",
      }}
      onMouseDown={(e) => {
        if (disabled) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (isNaN(x) || isNaN(y)) return
        const rwMousePoint = applyToPoint(inverse(transform!), { x, y })

        if (!isElementSelected) {
          for (const e of soup) {
            if (
              (e.type === "pcb_smtpad" &&
                isInsideOfSmtpad(e, rwMousePoint, 10 / transform.a)) ||
              (e.type === "pcb_plated_hole" &&
                isInsideOfPlatedHole(e, rwMousePoint, 10 / transform.a))
            ) {
              if (!e.pcb_port_id) {
                toast.error(`pcb_port_id is null on the selected "${e.type}"`)
                return
              }
              setSelectedElement(e)
              setShouldCreateAsVia(false)
              setDragState({
                dragStart: rwMousePoint,
                originalCenter: { x: e.x, y: e.y },
                dragEnd: rwMousePoint,
                editEvent: {
                  pcb_edit_event_type: "edit_trace_hint",
                  pcb_port_id: e.pcb_port_id!,
                  pcb_trace_hint_id: Math.random().toString(),
                  route: [],
                  created_at: Date.now(),
                  edit_event_id: Math.random().toString(),
                  in_progress: true,
                },
                shouldDrawRouteHint: false,
              })

              cancelPanDrag()
              break
            }
          }
        } else {
          setDragState({
            ...(dragState as any),
            dragStart: rwMousePoint,
            shouldDrawRouteHint: true,
          })
        }
      }}
      onMouseMove={(e) => {
        if (!isElementSelected || !dragState) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (isNaN(x) || isNaN(y)) return
        const rwMousePoint = applyToPoint(inverse(transform!), { x, y })
        setDragState({
          ...dragState,
          dragEnd: rwMousePoint,
        })
      }}
      onMouseUp={(e) => {
        if (!isElementSelected) return
        if (!dragState?.shouldDrawRouteHint) return

        // Compute distance that has been dragged
        const { dragStart, dragEnd } = dragState
        const rwDist = Math.sqrt(
          (dragEnd.x - dragStart.x) ** 2 + (dragEnd.y - dragStart.y) ** 2,
        )
        const screenDist = rwDist * transform.a

        // If the user dragged, don't create a point
        if (screenDist > 20) return

        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (isNaN(x) || isNaN(y)) return
        const rwMousePoint = applyToPoint(inverse(transform!), { x, y })

        if (dragState) {
          cancelPanDrag()
          const lastPointScreen = applyToPoint(
            transform,
            dragState.editEvent.route.slice(-1)[0] ?? dragState.originalCenter,
          )
          const distanceFromLastPoint = Math.sqrt(
            (x - lastPointScreen.x) ** 2 + (y - lastPointScreen.y) ** 2,
          )
          if (distanceFromLastPoint < 20) {
            // Close the trace hint
            onCreateEditEvent({
              ...dragState.editEvent,
              in_progress: false,
            })
            setDragState(null)
            setSelectedElement(null)
            return
          }
          // Edit existing edit event by adding a new point at the rwMousePoint
          setDragState({
            ...dragState,
            editEvent: {
              ...dragState.editEvent,
              route: [
                ...dragState.editEvent.route,
                { ...rwMousePoint, via: shouldCreateAsVia },
              ],
            },
          })
        }
      }}
    >
      {children}
      {in_edit_trace_mode &&
        dragState?.editEvent &&
        ogCenterScreen &&
        dragEndScreen && (
          <svg
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              pointerEvents: "none",
              mixBlendMode: "difference",
              zIndex: zIndexMap.editTraceHintOverlay,
            }}
            width={containerBounds?.width}
            height={containerBounds?.height}
          >
            <path
              stroke="red"
              d={`M ${ogCenterScreen.x} ${ogCenterScreen.y
                } ${dragState?.editEvent.route
                  .map((p) => applyToPoint(transform!, p))
                  .map((p) => `L ${p.x} ${p.y}`)
                  .join(" ")} L ${dragEndScreen.x} ${dragEndScreen.y}`}
            />
            {dragState?.editEvent.route.map((r, i) => {
              const rScreen = applyToPoint(transform!, r)
              return (
                <Fragment key={`r-${i}`}>
                  {r.via && (
                    <circle cx={rScreen.x} cy={rScreen.y} r={16} stroke="red" />
                  )}
                  <circle cx={rScreen.x} cy={rScreen.y} r={8} stroke="red" />
                </Fragment>
              )
            })}
            {shouldCreateAsVia && (
              <circle
                key="via-outer-circle"
                cx={dragEndScreen.x}
                cy={dragEndScreen.y}
                r={16}
                stroke="red"
              />
            )}
            <circle
              cx={dragEndScreen.x}
              cy={dragEndScreen.y}
              r={8}
              stroke="red"
            />
          </svg>
        )}
      {!disabled && (
        <svg
          key={"pcb-trace-hints"}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "none",
            mixBlendMode: "difference",
            zIndex: zIndexMap.editTraceHintOverlay,
          }}
          width={containerBounds?.width}
          height={containerBounds?.height}
        >
          {soup
            .filter((e): e is PcbTraceHint => e.type === "pcb_trace_hint")
            .map((e) => {
              const { route } = e
              const pcb_port = su(soup as any).pcb_port.get(e.pcb_port_id)!
              const pcb_port_screen = applyToPoint(transform!, pcb_port)
              return (
                <Fragment key={e.pcb_trace_hint_id}>
                  <rect
                    key={`rect-${e.pcb_port_id}`}
                    x={pcb_port_screen.x - 10}
                    y={pcb_port_screen.y - 10}
                    width={20}
                    height={20}
                    stroke="red"
                  />
                  <path
                    key={`path-${e.pcb_port_id}`}
                    stroke="red"
                    d={`M ${pcb_port_screen.x} ${pcb_port_screen.y} ${route
                      .map((r) => applyToPoint(transform!, r!))
                      .map((r) => `L ${r.x} ${r.y}`)
                      .join(" ")}`}
                  />
                  {route
                    .map((r) => ({ ...r, ...applyToPoint(transform, r!) }))
                    .map((r, i) => (
                      <Fragment key={i}>
                        <circle cx={r.x} cy={r.y} r={8} stroke="red" />
                        {r.via && (
                          <circle
                            cx={r.x}
                            cy={r.y}
                            r={16}
                            stroke="red"
                            fill="transparent"
                          />
                        )}
                      </Fragment>
                    ))}
                </Fragment>
              )
            })}
        </svg>
      )}
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
        }}
      >
        {isElementSelected && (
          <HotkeyActionMenu
            hotkeys={[
              {
                key: "v",
                name: "Toggle Via",
                onUse: () => {
                  setShouldCreateAsVia(!shouldCreateAsVia)
                },
              },
              // {
              //   key: "del",
              //   name: "Delete Node",
              //   onUse: () => {},
              // },
              // {
              //   key: "r",
              //   name: "Delete Route",
              //   onUse: () => {},
              // },
            ]}
          />
        )}
      </div>
    </div>
  )
}

function getExpandedStroke(
  strokeInput: (Point | [number, number] | number[])[],
  defaultWidth: number,
): Point[] {
  if (strokeInput.length < 2) {
    throw new Error("Stroke must have at least two points")
  }

  const stroke: Point[] = strokeInput.map((point) => {
    if (Array.isArray(point)) {
      return { x: point[0], y: point[1] }
    }
    return point as Point
  })

  const leftSide: Point[] = []
  const rightSide: Point[] = []

  function getNormal(p1: Point, p2: Point): Point {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const length = Math.sqrt(dx * dx + dy * dy)
    return { x: -dy / length, y: dx / length }
  }

  function addPoint(
    point: Point,
    normal: Point,
    factor: number,
    width: number,
  ) {
    const halfWidth = width / 2
    const newPoint = {
      x: point.x + normal.x * halfWidth * factor,
      y: point.y + normal.y * halfWidth * factor,
    }
    if (factor > 0) {
      leftSide.push(newPoint)
    } else {
      rightSide.unshift(newPoint)
    }
  }

  // Handle the first point
  const firstNormal = getNormal(stroke[0]!, stroke[1]!)
  const firstWidth = stroke[0]!.trace_width ?? defaultWidth
  addPoint(stroke[0]!, firstNormal, 1, firstWidth)
  addPoint(stroke[0]!, firstNormal, -1, firstWidth)

  // Handle middle points
  for (let i = 1; i < stroke.length - 1; i++) {
    const prev = stroke[i - 1]!
    const current = stroke[i]!
    const next = stroke[i + 1]!

    const normalPrev = getNormal(prev, current)
    const normalNext = getNormal(current, next)

    // Calculate miter line
    const miterX = normalPrev.x + normalNext.x
    const miterY = normalPrev.y + normalNext.y
    const miterLength = Math.sqrt(miterX * miterX + miterY * miterY)

    const currentWidth = current.trace_width ?? defaultWidth

    // Check if miter is too long (sharp corner)
    const miterLimit = 2 // Adjust this value to control when to bevel
    if (miterLength / 2 > miterLimit * (currentWidth / 2)) {
      // Use bevel join
      addPoint(current, normalPrev, 1, currentWidth)
      addPoint(current, normalNext, 1, currentWidth)
      addPoint(current, normalPrev, -1, currentWidth)
      addPoint(current, normalNext, -1, currentWidth)
    } else {
      // Use miter join
      const scale = 1 / miterLength
      addPoint(
        current,
        { x: miterX * scale, y: miterY * scale },
        1,
        currentWidth,
      )
      addPoint(
        current,
        { x: miterX * scale, y: miterY * scale },
        -1,
        currentWidth,
      )
    }
  }

  // Handle the last point
  const lastNormal = getNormal(
    stroke[stroke.length - 2]!,
    stroke[stroke.length - 1]!,
  )
  const lastWidth = stroke[stroke.length - 1]!.trace_width ?? defaultWidth
  addPoint(stroke[stroke.length - 1]!, lastNormal, 1, lastWidth)
  addPoint(stroke[stroke.length - 1]!, lastNormal, -1, lastWidth)

  // Combine left and right sides to form a closed polygon
  return [...leftSide, ...rightSide]
}
