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
  clickToEnableZoom?: boolean
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
  clickToEnableZoom = false,
}: Props) => {
  circuitJson ??= soup
  const {
    circuitJson: circuitJsonFromChildren,
    error: errorFromChildren,
    isLoading,
  } = useRenderedCircuit(children)
  circuitJson ??= circuitJsonFromChildren ?? []

  const [isZoomEnabled, setIsZoomEnabled] = useState(!clickToEnableZoom)
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
      (!clickToEnableZoom || isZoomEnabled)
    ) {
      resetTransform()
    }
  }, [children, soup, refDimensions, clickToEnableZoom, isZoomEnabled])

  const pcbElmsPreEdit = useMemo(
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

  const renderContent = () => (
    <div ref={ref as any}>
      <ContextProviders initialState={initialState}>
        <CanvasElementsRenderer
          key={refDimensions.width}
          transform={transform}
          height={height}
          width={refDimensions.width}
          allowEditing={allowEditing}
          focusOnHover={focusOnHover}
          cancelPanDrag={isZoomEnabled ? cancelPanDrag : () => {}}
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
  )

  return (
    <div
      onClick={() => {
        if (clickToEnableZoom && !isZoomEnabled) {
          setIsZoomEnabled(true)
        }
      }}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {clickToEnableZoom && !isZoomEnabled && (
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
            zIndex: 100,
          }}
        >
          Click to Enable Zoom
        </div>
      )}
      <div ref={isZoomEnabled ? transformRef as any : undefined}>
        {renderContent()}
      </div>
    </div>
  )
}
