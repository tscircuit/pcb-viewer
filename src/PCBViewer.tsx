import React, { useEffect, useMemo, useState } from "react"
import type { AnyCircuitElement } from "circuit-json"
import { CanvasElementsRenderer } from "./components/CanvasElementsRenderer"
import useMouseMatrixTransform from "use-mouse-matrix-transform"
import { useMeasure } from "react-use"
import { compose, scale, translate } from "transformation-matrix"
import { getBoundsOfPcbElements } from "@tscircuit/soup-util"
import { ContextProviders } from "components/ContextProviders"
import type { EditEvent } from "lib/edit-events"
import { applyEditEvents } from "lib/apply-edit-events"
import { RatsNestOverlay } from "./components/RatsNestOverlay"
import type { StateProps } from "global-store"
import { ToastContainer } from "lib/toast"
import { useRenderedCircuit } from "@tscircuit/core"
const defaultTransform = compose(translate(400, 300), scale(40, -40))

type Props = {
  children?: any
  soup?: any
  height?: number
  allowEditing?: boolean
  editEvents?: EditEvent[]
  initialState?: Partial<StateProps>
  onEditEventsChanged?: (editEvents: EditEvent[]) => void
}

export const PCBViewer = ({
  children,
  soup,
  height = 600,
  initialState,
  allowEditing = true,
  editEvents: editEventsProp,
  onEditEventsChanged,
}: Props) => {
  const { circuitJson: circuitJsonFromChildren, error: errorFromChildren } =
    useRenderedCircuit(children)
  const stateElements = circuitJsonFromChildren ?? soup ?? []

  const [ref, refDimensions] = useMeasure()
  const [transform, setTransformInternal] = useState(defaultTransform)
  const {
    ref: transformRef,
    setTransform,
    cancelDrag: cancelPanDrag,
  } = useMouseMatrixTransform({
    transform,
    onSetTransform: setTransformInternal,
  })
  let [editEvents, setEditEvents] = useState<EditEvent[]>([])
  editEvents = editEventsProp ?? editEvents

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(errorFromChildren ? errorFromChildren.toString() : null)
  }, [errorFromChildren])

  const resetTransform = () => {
    const elmBounds =
      refDimensions?.width > 0 ? refDimensions : { width: 500, height: 500 }
    const { minX, minY, maxX, maxY } = elements.some((e) =>
      e.type.startsWith("pcb_"),
    )
      ? getBoundsOfPcbElements(
          elements.filter((e) => e.type.startsWith("pcb_")) as any,
        )
      : { minX: -0.001, minY: -0.001, maxX: 0.001, maxY: 0.001 }

    const width = maxX - minX
    const height = maxY - minY
    const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }

    const scaleFactor =
      Math.min(
        (elmBounds.width ?? 0) / width,
        (elmBounds.height ?? 0) / height,
        100,
      ) * 0.75
    setTransform(
      compose(
        translate((elmBounds.width ?? 0) / 2, (elmBounds.height ?? 0) / 2),
        // translate(100, 0),
        scale(scaleFactor, -scaleFactor, 0, 0),
        translate(-center.x, -center.y),
      ),
    )
  }

  useEffect(() => {
    if (refDimensions && refDimensions.width !== 0 && (children || soup)) {
      resetTransform()
    }
  }, [children, refDimensions])

  if (error) return <div style={{ color: "red" }}> {error} </div>

  const pcbElmsPreEdit: AnyCircuitElement[] = (soup ?? stateElements).filter(
    (e: any) => e.type.startsWith("pcb_") || e.type.startsWith("source_"),
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
    <div ref={transformRef as any}>
      <div ref={ref as any}>
        <ContextProviders initialState={initialState}>
          <CanvasElementsRenderer
            key={refDimensions.width}
            transform={transform}
            height={height}
            width={refDimensions.width}
            allowEditing={allowEditing}
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
    </div>
  )
}
