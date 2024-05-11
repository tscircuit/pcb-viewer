import type {
  AnySoupElement,
  PCBComponent,
  PCBSMTPad,
} from "@tscircuit/builder"
import { useGlobalStore } from "global-store"
import { EditEvent, EditTraceHintEvent } from "lib/edit-events"
import { useEffect, useRef, useState } from "react"
import { Matrix, applyToPoint, identity, inverse } from "transformation-matrix"
import type { PcbRouteHint } from "@tscircuit/soup"

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
  } | null>(null)
  const isElementSelected = selectedElement !== null
  const in_edit_trace_mode = useGlobalStore((s) => s.in_draw_trace_mode)

  const disabled = disabledProp || !in_edit_trace_mode

  let ogCenterScreen, dragEndScreen
  if (dragState?.originalCenter && dragState?.dragEnd) {
    ogCenterScreen = applyToPoint(transform, dragState?.originalCenter!)
    dragEndScreen = applyToPoint(transform, dragState?.dragEnd!)
  }

  useEffect(() => {
    console.log(isElementSelected)
    if (!isElementSelected) return
    console.log("adding keydown listener")

    function keyDown(e: KeyboardEvent) {
      console.log("keydown", e.key)
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
              // setActivePcbComponent(e.pcb_component_id)
              setDragState({
                dragStart: rwMousePoint,
                originalCenter: { x: e.x, y: e.y },
                dragEnd: rwMousePoint,
                editEvent: {
                  pcb_edit_event_type: "edit_trace_hint",
                  pcb_port_id: e.pcb_port_id!,
                  path: [{ x: e.x, y: e.y }],
                  created_at: Date.now(),
                  edit_event_id: Math.random().toString(),
                  in_progress: true,
                },
              })

              cancelPanDrag()
              break
            }
          }
        } else if (dragState) {
          cancelPanDrag()
          const lastPointScreen = applyToPoint(
            transform,
            dragState.editEvent.path.slice(-1)[0],
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
              path: [...dragState.editEvent.path, rwMousePoint],
            },
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
        // onModifyEditEvent({
        //   edit_event_id: dragState.edit_event_id,
        //   new_center: {
        //     x:
        //       dragState.originalCenter.x +
        //       rwMousePoint.x -
        //       dragState.dragStart.x,
        //     y:
        //       dragState.originalCenter.y +
        //       rwMousePoint.y -
        //       dragState.dragStart.y,
        //   },
        // })
      }}
      onMouseUp={(e) => {
        if (!isElementSelected) return
        // setActivePcbComponent(null)
        // setIsMovingComponent(false)
        // if (dragState) {
        //   onModifyEditEvent({
        //     edit_event_id: dragState.edit_event_id,
        //     in_progress: false,
        //   })
        //   setDragState(null)
        // }
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
              d={`M ${ogCenterScreen.x} ${ogCenterScreen.y} ${dragState?.editEvent.path
                .map((p) => applyToPoint(transform!, p))
                .map((p) => `L ${p.x} ${p.y}`)
                .join(" ")} L ${dragEndScreen.x} ${dragEndScreen.y}`}
            />
            {/* <line
            x1={ogCenterScreen.x}
            y1={ogCenterScreen.y}
            x2={dragEndScreen.x}
            y2={dragEndScreen.y}
            stroke="red"
          /> */}
          </svg>
        )}
      {!disabled &&
        soup
          .filter((e): e is PCBSMTPad => e.type === "pcb_smtpad")
          .map((e) => {
            return null
            // if (!e?.center) return null
            const projectedCenter = applyToPoint(transform, e)

            return (
              <div
                key={e.pcb_component_id}
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  // b/c of transform, this is actually center not left/top
                  left: projectedCenter.x,
                  top: projectedCenter.y,
                  width: 0.5 * transform.a + 20,
                  height: 0.5 * transform.a + 20,
                  transform: "translate(-50%, -50%)",
                  background:
                    isElementSelected &&
                    selectedElement.pcb_smtpad_id === e.pcb_smtpad_id
                      ? "rgba(255, 0, 0, 0.2)"
                      : "",
                }}
              />
            )
          })}
    </div>
  )
}
