import type { AnyCircuitElement, PcbComponent } from "circuit-json"
import { type State, useGlobalStore } from "../global-store"
import type { ReactNode } from "react"
import { useMemo, useRef, useState } from "react"
import type { Matrix } from "transformation-matrix"
import { applyToPoint, identity, inverse } from "transformation-matrix"
import type { ManualEditEvent } from "@tscircuit/props"
import { shouldPickPcbComponent } from "../lib/should-pick-pcb-component"

interface Props {
  transform?: Matrix
  children: ReactNode
  soup: AnyCircuitElement[]
  disabled?: boolean
  cancelPanDrag: () => void
  onCreateEditEvent: (event: ManualEditEvent) => void
  onModifyEditEvent: (event: Partial<ManualEditEvent>) => void
}

const HIT_PADDING_PX = 10

const selectPlacementPickerState = (state: State) => ({
  inMoveFootprintMode: state.in_move_footprint_mode,
  selectedLayer: state.selected_layer,
  showTopComponents: state.is_showing_top_components,
  showBottomComponents: state.is_showing_bottom_components,
  setIsMovingComponent: state.setIsMovingComponent,
})

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
  const scale = Math.abs(transform.a)
  const {
    inMoveFootprintMode,
    selectedLayer,
    showTopComponents,
    showBottomComponents,
    setIsMovingComponent,
  } = useGlobalStore(selectPlacementPickerState)

  const pickablePcbComponents = useMemo(
    () =>
      soup.filter(
        (element): element is PcbComponent =>
          element.type === "pcb_component" &&
          shouldPickPcbComponent(element, {
            selectedLayer,
            showTopComponents,
            showBottomComponents,
          }),
      ),
    [soup, selectedLayer, showTopComponents, showBottomComponents],
  )

  const disabled = disabledProp || !inMoveFootprintMode

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
        const hitPadding = HIT_PADDING_PX / scale

        let foundActiveComponent = false
        for (const e of pickablePcbComponents) {
          if (isInsideOf(e, rwMousePoint, hitPadding)) {
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
      onMouseUp={() => {
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
        pickablePcbComponents.map((e) => {
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
                width: e.width * scale + HIT_PADDING_PX * 2,
                height: e.height * scale + HIT_PADDING_PX * 2,
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
