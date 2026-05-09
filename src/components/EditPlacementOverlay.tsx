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

const isInsideOf = (
  pcb_component: PcbComponent,
  point: { x: number; y: number },
  padding = 0,
) => {
  const halfWidth = pcb_component.width / 2
  const halfHeight = pcb_component.height / 2

  const left = pcb_component.center.x - halfWidth - padding
  const right = pcb_component.center.x + halfWidth + padding
  const top = pcb_component.center.y - halfHeight - padding
  const bottom = pcb_component.center.y + halfHeight + padding

  return point.x > left && point.x < right && point.y > top && point.y < bottom
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
  const [dragState, setDragState] = useState<{
    dragStart: { x: number; y: number }
    originalCenter: { x: number; y: number }
    dragEnd: { x: number; y: number }
    edit_event_id: string
  } | null>(null)
  const isPcbComponentActive = activePcbComponentId !== null
  const in_edit_mode = useGlobalStore((s) => s.in_edit_mode)
  const in_move_footprint_mode = useGlobalStore((s) => s.in_move_footprint_mode)
  const setIsMovingComponent = useGlobalStore((s) => s.setIsMovingComponent)
  const selectedLayer = useGlobalStore((s) => s.selected_layer)
  const isShowingTopComponents = useGlobalStore(
    (s) => s.is_showing_top_components,
  )
  const isShowingBottomComponents = useGlobalStore(
    (s) => s.is_showing_bottom_components,
  )

  const disabled = disabledProp || !in_move_footprint_mode

  // A pcb_component is pickable only if (a) it lives on the currently
  // selected copper layer or has no layer (e.g. through-hole / via /
  // plated-hole component, which exists on both sides), AND (b) the
  // user hasn't toggled its layer's components off via the View menu.
  // Without this filter the picker would happily grab a top component
  // even when the bottom layer is selected and "Show Top Components"
  // is off — the user can't see it but they can move it, which is
  // confusing.
  const isPickable = (c: PcbComponent): boolean => {
    const layer = (c as any).layer
    if (layer === "top" && !isShowingTopComponents) return false
    if (layer === "bottom" && !isShowingBottomComponents) return false
    if (layer === "top" && selectedLayer === "bottom") return false
    if (layer === "bottom" && selectedLayer === "top") return false
    return true
  }

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
        if (Number.isNaN(x) || Number.isNaN(y)) return
        const rwMousePoint = applyToPoint(inverse(transform!), { x, y })

        let foundActiveComponent = false
        for (const e of soup) {
          if (
            e.type === "pcb_component" &&
            isPickable(e as PcbComponent) &&
            isInsideOf(e, rwMousePoint, 10 / transform.a)
          ) {
            cancelPanDrag()
            setActivePcbComponent(e.pcb_component_id)
            foundActiveComponent = true
            const edit_event_id = Math.random().toString()
            setDragState({
              dragStart: rwMousePoint,
              originalCenter: e.center,
              dragEnd: rwMousePoint,
              edit_event_id,
            })

            onCreateEditEvent({
              edit_event_id,
              edit_event_type: "edit_pcb_component_location",
              pcb_edit_event_type: "edit_component_location",
              pcb_component_id: e.pcb_component_id,
              original_center: e.center,
              new_center: e.center,
              in_progress: true,
              created_at: Date.now(),
            })

            setIsMovingComponent(true)
            break
          }
        }
        if (!foundActiveComponent) {
          setActivePcbComponent(null)
        }

        if (foundActiveComponent) {
          e.preventDefault()
          return false
        }
      }}
      onMouseMove={(e) => {
        if (!activePcbComponentId || !dragState) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (Number.isNaN(x) || Number.isNaN(y)) return
        const rwMousePoint = applyToPoint(inverse(transform!), { x, y })
        setDragState({
          ...dragState,
          dragEnd: rwMousePoint,
        })
        onModifyEditEvent({
          edit_event_id: dragState.edit_event_id,
          new_center: {
            x:
              dragState.originalCenter.x +
              rwMousePoint.x -
              dragState.dragStart.x,
            y:
              dragState.originalCenter.y +
              rwMousePoint.y -
              dragState.dragStart.y,
          },
        })
      }}
      onMouseUp={(e) => {
        if (!activePcbComponentId) return
        setActivePcbComponent(null)
        setIsMovingComponent(false)
        if (dragState) {
          onModifyEditEvent({
            edit_event_id: dragState.edit_event_id,
            in_progress: false,
          })
          setDragState(null)
        }
      }}
    >
      {children}
      {!disabled &&
        soup
          .filter((e): e is PcbComponent => e.type === "pcb_component")
          .filter(isPickable)
          .map((e) => {
            if (!e?.center) return null
            const projectedCenter = applyToPoint(transform, e.center)

            return (
              <div
                key={e.pcb_component_id}
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  // b/c of transform, this is actually center not left/top
                  left: projectedCenter.x,
                  top: projectedCenter.y,
                  width: e.width * transform.a + 20,
                  height: e.height * transform.a + 20,
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
