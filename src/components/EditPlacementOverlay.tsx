import type { ManualEditEvent } from "@tscircuit/props"
import type { AnyCircuitElement, PcbComponent } from "circuit-json"
import { useEffect, useRef, useState } from "react"
import type { Matrix } from "transformation-matrix"
import { applyToPoint, identity, inverse } from "transformation-matrix"
import { useGlobalStore } from "../global-store"

interface Props {
  transform?: Matrix
  children: any
  soup: AnyCircuitElement[]
  disabled?: boolean
  cancelPanDrag: () => void
  onCreateEditEvent: (event: ManualEditEvent) => void
  onModifyEditEvent: (event: Partial<ManualEditEvent>) => void
}

export const isInsideOf = (
  pcb_component: PcbComponent,
  point: { x: number; y: number },
  padding = 0,
) => {
  const safePadding = Math.abs(padding)
  const halfWidth = (pcb_component.width || 0) / 2
  const halfHeight = (pcb_component.height || 0) / 2

  const left = pcb_component.center.x - halfWidth - safePadding
  const right = pcb_component.center.x + halfWidth + safePadding
  const top = pcb_component.center.y - halfHeight - safePadding
  const bottom = pcb_component.center.y + halfHeight + safePadding

  return point.x > left && point.x < right && point.y > top && point.y < bottom
}

interface DragState {
  pcb_component_id: string
  dragStart: { x: number; y: number }
  originalCenter: { x: number; y: number }
  dragEnd: { x: number; y: number }
  edit_event_id: string
}

export const EditPlacementOverlay = ({
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
  const [activePcbComponentId, setActivePcbComponent] = useState<null | string>(
    null,
  )
  const [dragState, setDragState] = useState<DragState | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const isPcbComponentActive = activePcbComponentId !== null
  const in_edit_mode = useGlobalStore((s) => s.in_edit_mode)
  const in_move_footprint_mode = useGlobalStore((s) => s.in_move_footprint_mode)
  const setIsMovingComponent = useGlobalStore((s) => s.setIsMovingComponent)

  const disabled = disabledProp || !in_move_footprint_mode

  useEffect(() => {
    const handleWindowMouseUp = () => {
      const currentDrag = dragStateRef.current
      if (!currentDrag) return
      dragStateRef.current = null
      containerRef.current?.removeAttribute("data-toolbar-overlay")
      containerRef.current?.removeAttribute("data-edit-placement-active")
      setActivePcbComponent(null)
      setDragState(null)
      setIsMovingComponent(false)
      onModifyEditEvent({
        edit_event_id: currentDrag.edit_event_id,
        in_progress: false,
      })
    }

    window.addEventListener("mouseup", handleWindowMouseUp)
    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp)
    }
  }, [onModifyEditEvent, setIsMovingComponent])

  return (
    <div
      ref={containerRef}
      data-edit-placement-active={isPcbComponentActive ? "true" : undefined}
      data-toolbar-overlay={isPcbComponentActive ? "" : undefined}
      style={{
        position: "relative",
        overflow: "hidden",
      }}
      onMouseDownCapture={(e) => {
        if (disabled) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (Number.isNaN(x) || Number.isNaN(y)) return
        const rwMousePoint = applyToPoint(inverse(transform!), { x, y })
        const hitPadding = 10 / Math.max(Math.abs(transform.a), 1e-6)
        const hitsComponent = soup.some(
          (el) =>
            el.type === "pcb_component" &&
            isInsideOf(el, rwMousePoint, hitPadding),
        )
        if (hitsComponent) {
          e.currentTarget.setAttribute("data-toolbar-overlay", "")
          e.currentTarget.setAttribute("data-edit-placement-active", "true")
          cancelPanDrag()
        } else {
          e.currentTarget.removeAttribute("data-toolbar-overlay")
          e.currentTarget.removeAttribute("data-edit-placement-active")
        }
      }}
      onMouseDown={(e) => {
        if (disabled) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (Number.isNaN(x) || Number.isNaN(y)) return
        const rwMousePoint = applyToPoint(inverse(transform!), { x, y })
        const hitPadding = 10 / Math.max(Math.abs(transform.a), 1e-6)

        let foundActiveComponent = false
        for (const el of soup) {
          if (
            el.type === "pcb_component" &&
            isInsideOf(el, rwMousePoint, hitPadding)
          ) {
            cancelPanDrag()
            e.currentTarget.setAttribute("data-toolbar-overlay", "")
            e.currentTarget.setAttribute("data-edit-placement-active", "true")
            const edit_event_id = Math.random().toString()
            const nextDragState: DragState = {
              pcb_component_id: el.pcb_component_id,
              dragStart: rwMousePoint,
              originalCenter: el.center,
              dragEnd: rwMousePoint,
              edit_event_id,
            }
            dragStateRef.current = nextDragState
            setActivePcbComponent(el.pcb_component_id)
            setDragState(nextDragState)
            foundActiveComponent = true

            onCreateEditEvent({
              edit_event_id,
              edit_event_type: "edit_pcb_component_location",
              pcb_edit_event_type: "edit_component_location",
              pcb_component_id: el.pcb_component_id,
              original_center: el.center,
              new_center: el.center,
              in_progress: true,
              created_at: Date.now(),
            })

            setIsMovingComponent(true)
            break
          }
        }
        if (!foundActiveComponent) {
          dragStateRef.current = null
          e.currentTarget.removeAttribute("data-toolbar-overlay")
          e.currentTarget.removeAttribute("data-edit-placement-active")
          setActivePcbComponent(null)
          setDragState(null)
        }

        if (foundActiveComponent) {
          e.preventDefault()
          e.stopPropagation()
          return false
        }
      }}
      onMouseMove={(e) => {
        const currentDrag = dragStateRef.current ?? dragState
        if (!currentDrag) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (Number.isNaN(x) || Number.isNaN(y)) return
        cancelPanDrag()
        e.preventDefault()
        e.stopPropagation()
        const rwMousePoint = applyToPoint(inverse(transform!), { x, y })
        const updatedDrag: DragState = {
          ...currentDrag,
          dragEnd: rwMousePoint,
        }
        dragStateRef.current = updatedDrag
        setDragState(updatedDrag)
        onModifyEditEvent({
          edit_event_id: currentDrag.edit_event_id,
          new_center: {
            x:
              currentDrag.originalCenter.x +
              rwMousePoint.x -
              currentDrag.dragStart.x,
            y:
              currentDrag.originalCenter.y +
              rwMousePoint.y -
              currentDrag.dragStart.y,
          },
        })
      }}
      onMouseUp={(e) => {
        const currentDrag = dragStateRef.current ?? dragState
        if (!currentDrag) return
        cancelPanDrag()
        e.preventDefault()
        e.stopPropagation()
        dragStateRef.current = null
        e.currentTarget.removeAttribute("data-toolbar-overlay")
        e.currentTarget.removeAttribute("data-edit-placement-active")
        setActivePcbComponent(null)
        setDragState(null)
        setIsMovingComponent(false)
        onModifyEditEvent({
          edit_event_id: currentDrag.edit_event_id,
          in_progress: false,
        })
      }}
    >
      {children}
      {!disabled &&
        soup
          .filter((e): e is PcbComponent => e.type === "pcb_component")
          .map((e) => {
            if (!e?.center) return null
            const projectedCenter = applyToPoint(transform, e.center)
            const scaleX = Math.abs(transform.a)

            return (
              <div
                key={e.pcb_component_id}
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  // b/c of transform, this is actually center not left/top
                  left: projectedCenter.x,
                  top: projectedCenter.y,
                  width: e.width * scaleX + 20,
                  height: e.height * scaleX + 20,
                  transform: "translate(-50%, -50%)",
                  background:
                    isPcbComponentActive &&
                    activePcbComponentId === e.pcb_component_id
                      ? "rgba(255, 0, 0, 0.2)"
                      : "",
                }}
              />
            )
          })}
    </div>
  )
}
