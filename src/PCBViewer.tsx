import { useRenderedCircuit } from "@tscircuit/core"
import { findBoundsAndCenter } from "@tscircuit/soup-util"
import type { AnyCircuitElement } from "circuit-json"
import { ContextProviders } from "components/ContextProviders"
import type { StateProps } from "global-store"
import { applyEditEvents } from "lib/apply-edit-events"
import type { EditEvent } from "lib/edit-events"
import { ToastContainer } from "lib/toast"
import { useEffect, useMemo, useState } from "react"
import { useMeasure } from "react-use"
import { compose, scale, translate } from "transformation-matrix"
import useMouseMatrixTransform from "use-mouse-matrix-transform"
import { CanvasElementsRenderer } from "./components/CanvasElementsRenderer"

const defaultTransform = compose(translate(400, 300), scale(40, -40))

type Props = {
  children?: any
  circuitJson?: AnyCircuitElement[]
  soup?: any // @deprecated Use circuitJson instead
  height?: number
  allowEditing?: boolean
  editEvents?: EditEvent[]
  initialState?: Partial<StateProps>
  onEditEventsChanged?: (editEvents: EditEvent[]) => void
  focusOnHover?: boolean
  clickToInteractEnabled?: boolean
}

export const PCBViewer = ({
  children,
  soup,
  circuitJson,
  height = 600,
  initialState,
  allowEditing = true,
  editEvents: editEventsProp,
  onEditEventsChanged,
  focusOnHover = false,
  clickToInteractEnabled = false,
}: Props) => {
  circuitJson ??= soup
  const {
    circuitJson: circuitJsonFromChildren,
    error: errorFromChildren,
    isLoading,
  } = useRenderedCircuit(children)
  circuitJson ??= circuitJsonFromChildren ?? []

  const [isInteractionEnabled, setIsInteractionEnabled] = useState(!clickToInteractEnabled)
  const [ref, refDimensions] = useMeasure()
  const [transform, setTransformInternal] = useState(defaultTransform)
  const {
    ref: transformRef,
    setTransform,
    cancelDrag: cancelPanDrag,
  } = useMouseMatrixTransform({
    transform,
    onSetTransform: setTransformInternal,
    enabled: isInteractionEnabled,
  })

  let [editEvents, setEditEvents] = useState<EditEvent[]>([])
  editEvents = editEventsProp ?? editEvents

  const resetTransform = () => {
    const elmBounds =
      refDimensions?.width > 0 ? refDimensions : { width: 500, height: 500 }
    const { center, width, height } = elements.some((e) =>
      e.type.startsWith("pcb_"),
    )
      ? findBoundsAndCenter(
          elements.filter((e) => e.type.startsWith("pcb_")) as any,
        )
      : { center: { x: 0, y: 0 }, width: 0.001, height: 0.001 }
    const scaleFactor =
      Math.min(
        (elmBounds.width ?? 0) / width,
        (elmBounds.height ?? 0) / height,
        100,
      ) * 0.75
    setTransform(
      compose(
        translate((elmBounds.width ?? 0) / 2, (elmBounds.height ?? 0) / 2),
        scale(scaleFactor, -scaleFactor, 0, 0),
        translate(-center.x, -center.y),
      ),
    )
  }

  useEffect(() => {
    if (
      refDimensions &&
      refDimensions.width !== 0 &&
      (children || soup) &&
      (!clickToInteractEnabled || isInteractionEnabled)
    ) {
      resetTransform()
    }
  }, [children, refDimensions, clickToInteractEnabled, isInteractionEnabled])

  const pcbElmsPreEdit: AnyCircuitElement[] = useMemo(
    () =>
      circuitJson.filter(
        (e: any) => e.type.startsWith("pcb_") || e.type.startsWith("source_"),
      ),
    [circuitJson],
  )

  const elements = useMemo(() => {
    return applyEditEvents(pcbElmsPreEdit, editEvents)
  }, [pcbElmsPreEdit, editEvents])

  const onCreateEditEvent = (event: EditEvent) => {
    setEditEvents([...editEvents, event])
    onEditEventsChanged?.([...editEvents, event])
  }
  const onModifyEditEvent = (modifiedEvent: Partial<EditEvent>) => {
    const newEditEvents: EditEvent[] = editEvents.map((e) =>
      e.edit_event_id === modifiedEvent.edit_event_id
        ? ({ ...e, ...modifiedEvent } as EditEvent)
        : e,
    )
    setEditEvents(newEditEvents)
    onEditEventsChanged?.(newEditEvents)
  }

  return (
    <div ref={transformRef as any} style={{ position: "relative" }}>
      <div ref={ref as any}>
        <ContextProviders initialState={initialState}>
          <CanvasElementsRenderer
            key={refDimensions.width}
            transform={transform}
            height={height}
            width={refDimensions.width}
            allowEditing={allowEditing}
            focusOnHover={focusOnHover}
            cancelPanDrag={cancelPanDrag}
            onCreateEditEvent={onCreateEditEvent}
            onModifyEditEvent={onModifyEditEvent}
            grid={{
              spacing: 1,
              view_window: {
                left: 0,
                right: refDimensions.width || 500,
                top: height,
                bottom: 0,
              },
            }}
            elements={elements}
          />
          <ToastContainer />
        </ContextProviders>
      </div>
      {clickToInteractEnabled && !isInteractionEnabled && (
        <div
          onClick={() => setIsInteractionEnabled(true)}
          style={{
            position: "absolute",
            inset: 0,
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              backgroundColor: "black",
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              pointerEvents: "none",
            }}
          >
            Click to Interact
          </div>
        </div>
      )}
    </div>
  )
}
