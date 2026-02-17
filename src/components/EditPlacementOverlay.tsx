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
  const [rotationState, setRotationState] = useState<{
    pcb_component_id: string
    edit_event_id: string
    original_rotation: number
    startAngle: number
  } | null>(null)
  const isPcbComponentActive = activePcbComponentId !== null
  const in_edit_mode = useGlobalStore((s) => s.in_edit_mode)
  const in_move_footprint_mode = useGlobalStore((s) => s.in_move_footprint_mode)
  const setIsMovingComponent = useGlobalStore((s) => s.setIsMovingComponent)

  const disabled = disabledProp || !in_move_footprint_mode

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
        if (rotationState) {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          if (Number.isNaN(x) || Number.isNaN(y)) return
          const rwMousePoint = applyToPoint(inverse(transform!), { x, y })
          const component = soup.find(
            (c) =>
              c.type === "pcb_component" &&
              c.pcb_component_id === rotationState.pcb_component_id,
          ) as PcbComponent | undefined
          if (!component) return
          const currentAngle = Math.atan2(
            rwMousePoint.y - component.center.y,
            rwMousePoint.x - component.center.x,
          )
          const deltaAngle = currentAngle - rotationState.startAngle
          onModifyEditEvent({
            edit_event_id: rotationState.edit_event_id,
            new_rotation: rotationState.original_rotation + deltaAngle,
          } as any)
          return
        }
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
        if (rotationState) {
          onModifyEditEvent({
            edit_event_id: rotationState.edit_event_id,
            in_progress: false,
          })
          setRotationState(null)
          return
        }
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
          .map((e) => {
            if (!e?.center) return null
            const projectedCenter = applyToPoint(transform, e.center)
            const isSelected =
              isPcbComponentActive &&
              activePcbComponentId === e.pcb_component_id
            const componentWidth = e.width * transform.a + 20
            const componentHeight = e.height * transform.a + 20

            return (
              <div
                key={e.pcb_component_id}
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  // b/c of transform, this is actually center not left/top
                  left: projectedCenter.x,
                  top: projectedCenter.y,
                  width: componentWidth,
                  height: componentHeight,
                  transform: `translate(-50%, -50%) rotate(${
                    typeof e.rotation === "number" ? -e.rotation : 0
                  }rad)`,
                  background: isSelected ? "rgba(255, 0, 0, 0.2)" : "",
                }}
              >
                {isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      width: 12,
                      height: 12,
                      background: "#4a9eff",
                      borderRadius: "50%",
                      border: "1px solid #fff",
                      cursor: "grab",
                      pointerEvents: "all",
                    }}
                    onMouseDown={(mouseEvent) => {
                      mouseEvent.stopPropagation()
                      cancelPanDrag()
                      const edit_event_id = Math.random().toString()
                      const component = soup.find(
                        (c) =>
                          c.type === "pcb_component" &&
                          c.pcb_component_id === activePcbComponentId,
                      ) as PcbComponent | undefined
                      const original_rotation =
                        typeof component?.rotation === "number"
                          ? component.rotation
                          : 0
                      const rect = containerRef.current!.getBoundingClientRect()
                      const x = mouseEvent.clientX - rect.left
                      const y = mouseEvent.clientY - rect.top
                      const rwMousePoint = applyToPoint(inverse(transform!), {
                        x,
                        y,
                      })
                      const startAngle = Math.atan2(
                        rwMousePoint.y - (component?.center.y ?? 0),
                        rwMousePoint.x - (component?.center.x ?? 0),
                      )
                      setRotationState({
                        pcb_component_id: activePcbComponentId!,
                        edit_event_id,
                        original_rotation,
                        startAngle,
                      })
                      onCreateEditEvent({
                        edit_event_id,
                        edit_event_type: "edit_pcb_component_rotation",
                        pcb_component_id: activePcbComponentId!,
                        original_rotation,
                        new_rotation: original_rotation,
                        in_progress: true,
                        created_at: Date.now(),
                      } as any)
                    }}
                  />
                )}
              </div>
            )
          })}
    </div>
  )
}
