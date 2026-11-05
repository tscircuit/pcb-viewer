import type { AnyCircuitElement, PcbComponent } from "circuit-json"
import { useMemo, useRef, useState } from "react"
import type { Matrix } from "transformation-matrix"
import { applyToPoint, identity, inverse } from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import {
  type PcbManualEditEvent,
  getGroupAndMemberIds,
  getSelectablePcbGroupForComponent,
} from "../lib/apply-edit-events"

interface Props {
  transform?: Matrix
  children: any
  soup: AnyCircuitElement[]
  disabled?: boolean
  cancelPanDrag: () => void
  onCreateEditEvent: (event: PcbManualEditEvent) => void
  onModifyEditEvent: (event: Partial<PcbManualEditEvent>) => void
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
  const [activePcbGroupId, setActivePcbGroup] = useState<null | string>(null)
  const [dragState, setDragState] = useState<{
    dragStart: { x: number; y: number }
    originalCenter: { x: number; y: number }
    dragEnd: { x: number; y: number }
    edit_event_id: string
  } | null>(null)
  const isPcbComponentActive =
    activePcbComponentId !== null || activePcbGroupId !== null
  const in_edit_mode = useGlobalStore((s) => s.in_edit_mode)
  const in_move_footprint_mode = useGlobalStore((s) => s.in_move_footprint_mode)
  const setIsMovingComponent = useGlobalStore((s) => s.setIsMovingComponent)

  const disabled = disabledProp || !in_move_footprint_mode
  const activeGroupMemberIds = useMemo(() => {
    if (!activePcbGroupId) return new Set<string>()
    return getGroupAndMemberIds({
      circuitJson: soup,
      pcbGroupId: activePcbGroupId,
    }).pcbComponentIds
  }, [activePcbGroupId, soup])

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
            const selectableGroup = getSelectablePcbGroupForComponent({
              circuitJson: soup,
              pcbComponent: e,
            })
            foundActiveComponent = true
            const edit_event_id = Math.random().toString()

            if (selectableGroup) {
              setActivePcbGroup(selectableGroup.pcb_group_id)
              setActivePcbComponent(null)
              setDragState({
                dragStart: rwMousePoint,
                originalCenter: selectableGroup.center,
                dragEnd: rwMousePoint,
                edit_event_id,
              })

              onCreateEditEvent({
                edit_event_id,
                edit_event_type: "edit_pcb_group_location",
                pcb_edit_event_type: "edit_group_location",
                pcb_group_id: selectableGroup.pcb_group_id,
                original_center: selectableGroup.center,
                new_center: selectableGroup.center,
                in_progress: true,
                created_at: Date.now(),
              })
            } else {
              setActivePcbComponent(e.pcb_component_id)
              setActivePcbGroup(null)
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
            }

            setIsMovingComponent(true)
            break
          }
        }
        if (!foundActiveComponent) {
          setActivePcbComponent(null)
          setActivePcbGroup(null)
        }

        if (foundActiveComponent) {
          e.preventDefault()
          return false
        }
      }}
      onMouseMove={(e) => {
        if ((!activePcbComponentId && !activePcbGroupId) || !dragState) return
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
        if (!activePcbComponentId && !activePcbGroupId) return
        setActivePcbComponent(null)
        setActivePcbGroup(null)
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
                    (activePcbComponentId === e.pcb_component_id ||
                      activeGroupMemberIds.has(e.pcb_component_id))
                      ? "rgba(255, 0, 0, 0.2)"
                      : "",
                }}
              />
            )
          })}
    </div>
  )
}
