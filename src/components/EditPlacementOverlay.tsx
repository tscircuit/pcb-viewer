import type { AnyCircuitElement, PcbComponent } from "circuit-json"
import { useGlobalStore } from "global-store"
import { EditEvent } from "lib/edit-events"
import { useEffect, useRef, useState } from "react"
import { Matrix, applyToPoint, identity, inverse } from "transformation-matrix"

interface Props {
  transform?: Matrix
  children: any
  soup: AnyCircuitElement[]
  disabled?: boolean
  cancelPanDrag: Function
  onCreateEditEvent: (event: EditEvent) => void
  onModifyEditEvent: (event: Partial<EditEvent>) => void
}

const isInsideOf = (
  pcb_component: PcbComponent,
  point: { x: number; y: number },
  padding: number = 0,
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
  const [isRotating, setIsRotating] = useState(false);
  const [startAngle, setStartAngle] = useState(0);
  const [currentRotation, setCurrentRotation] = useState(0);
  const isPcbComponentActive = activePcbComponentId !== null
  const in_edit_mode = useGlobalStore((s) => s.in_edit_mode)
  const in_move_footprint_mode = useGlobalStore((s) => s.in_move_footprint_mode)
  const setIsMovingComponent = useGlobalStore((s) => s.setIsMovingComponent)

  const disabled = disabledProp || !in_move_footprint_mode

  const handleRotationStart = (e: React.MouseEvent, component: PcbComponent) => {
    setIsRotating(true);
    setActivePcbComponent(component.pcb_component_id);
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    setStartAngle(angle);
    setCurrentRotation(component.rotation || 0);
  };

  const handleRotationMove = (e: MouseEvent) => {
    if (!isRotating || !activePcbComponentId) return;

    const rect = containerRef.current!.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const deltaAngle = angle - startAngle;
    const newRotation = (currentRotation + deltaAngle) % 360;

    onModifyEditEvent({
      edit_event_id: Math.random().toString(),
      pcb_edit_event_type: "edit_component_rotation",
      pcb_component_id: activePcbComponentId,
      rotation: newRotation,
    });

    setCurrentRotation(newRotation);
  };

  const handleRotationEnd = () => {
    if (activePcbComponentId) {
      setIsRotating(false);
      setActivePcbComponent(null);
    }
  };

  useEffect(() => {
    if (isRotating) {
      window.addEventListener("mousemove", handleRotationMove);
      window.addEventListener("mouseup", handleRotationEnd);
      return () => {
        window.removeEventListener("mousemove", handleRotationMove);
        window.removeEventListener("mouseup", handleRotationEnd);
      };
    }
  }, [isRotating]);


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
        if (isNaN(x) || isNaN(y)) return
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
          .map((e) => {
            if (!e?.center) return null
            const projectedCenter = applyToPoint(transform, e.center)
            const rotationHandlePosition = applyToPoint(transform!, {
              x: e.center.x + 20,
              y: e.center.y,
            });
            return (
              <>
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
                > 
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: rotationHandlePosition.x - projectedCenter.x - 5,
                    top: rotationHandlePosition.y - projectedCenter.y - 5,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: "#4a9eff",
                    cursor: "pointer",
                  }}
                  onMouseDown={(event) => handleRotationStart(event, e)}
                />
              </>
            )
          })}
    </div>
  )
}