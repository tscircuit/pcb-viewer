import type { AnySoupElement,PCBSMTPad } from "@tscircuit/soup"
import { su } from "@tscircuit/soup-util"
import { useGlobalStore } from "global-store"
import { EditEvent, EditTraceHintEvent } from "lib/edit-events"
import { Fragment, useEffect, useRef, useState } from "react"
import { Matrix, applyToPoint, identity, inverse } from "transformation-matrix"
import type { PcbRouteHint, PcbTraceHint } from "@tscircuit/soup"
import { HotkeyActionMenu } from "./HotkeyActionMenu"

interface Props {
  transform?: Matrix
  children: any
  soup: AnySoupElement[]
  disabled?: boolean
  cancelPanDrag: Function
  onCreateEditEvent: (event: EditTraceHintEvent) => void
  onModifyEditEvent: (event: Partial<EditTraceHintEvent>) => void
}

const isInsideOf = (
  elm: PCBSMTPad,
  point: { x: number; y: number },
  padding: number = 0,
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
  const [selectedElement, setSelectedElement] = useState<null | PCBSMTPad>(null)
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
              e.type === "pcb_smtpad" &&
              isInsideOf(e, rwMousePoint, 10 / transform.a)
            ) {
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
              zIndex: 1000,
            }}
            width={containerBounds?.width}
            height={containerBounds?.height}
          >
            <path
              stroke="red"
              d={`M ${ogCenterScreen.x} ${ogCenterScreen.y} ${dragState?.editEvent.route
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
            zIndex: 1000,
          }}
          width={containerBounds?.width}
          height={containerBounds?.height}
        >
          {soup
            .filter((e): e is PcbTraceHint => e.type === "pcb_trace_hint")
            .map((e) => {
              const { route } = e
              const pcb_port = su(soup).pcb_port.get(e.pcb_port_id)!
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
                      .map((r) => applyToPoint(transform!, r))
                      .map((r) => `L ${r.x} ${r.y}`)
                      .join(" ")}`}
                  />
                  {route
                    .map((r) => ({ ...r, ...applyToPoint(transform, r) }))
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
