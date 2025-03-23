import { useRenderedCircuit } from "@tscircuit/core"
import { findBoundsAndCenter } from "@tscircuit/soup-util"
import type { AnyCircuitElement } from "circuit-json"
import { ContextProviders } from "components/ContextProviders"
import type { StateProps } from "global-store"
import type { GraphicsObject } from "graphics-debug"
import { applyEditEvents } from "lib/apply-edit-events"
import type { EditEvent } from "lib/edit-events"
import { ToastContainer } from "lib/toast"
import { useEffect, useMemo, useRef, useState } from "react"
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
  disableAutoFocus?: boolean
  debugGraphics?: GraphicsObject | null
}

export const PCBViewer = ({
  children,
  soup,
  circuitJson,
  debugGraphics,
  height = 600,
  initialState,
  allowEditing = true,
  editEvents: editEventsProp,
  onEditEventsChanged,
  focusOnHover = false,
  clickToInteractEnabled = false,
  disableAutoFocus = false,
}: Props) => {
  circuitJson ??= soup
  const {
    circuitJson: circuitJsonFromChildren,
    error: errorFromChildren,
    isLoading,
  } = useRenderedCircuit(children) as any
  circuitJson ??= circuitJsonFromChildren ?? []

  const [isInteractionEnabled, setIsInteractionEnabled] = useState(
    !clickToInteractEnabled,
  )
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

  const initialRenderCompleted = useRef(false)
  const circuitJsonKey = `${circuitJson?.length || 0}_${JSON.stringify(circuitJson)}`

  const resetTransform = (shouldAnimate = false) => {
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

    const targetTransform = compose(
      translate((elmBounds.width ?? 0) / 2, (elmBounds.height ?? 0) / 2),
      scale(scaleFactor, -scaleFactor, 0, 0),
      translate(-center.x, -center.y),
    )

    if (!shouldAnimate) {
      setTransform(targetTransform)
      return
    }

    const startTransform = { ...transform }
    const startTime = Date.now()
    const duration = 1000

    const animateTransform = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeProgress = 1 - Math.pow(1 - progress, 3)

      const newTransform = {
        a:
          startTransform.a +
          (targetTransform.a - startTransform.a) * easeProgress,
        b:
          startTransform.b +
          (targetTransform.b - startTransform.b) * easeProgress,
        c:
          startTransform.c +
          (targetTransform.c - startTransform.c) * easeProgress,
        d:
          startTransform.d +
          (targetTransform.d - startTransform.d) * easeProgress,
        e:
          startTransform.e +
          (targetTransform.e - startTransform.e) * easeProgress,
        f:
          startTransform.f +
          (targetTransform.f - startTransform.f) * easeProgress,
      }

      setTransform(newTransform)

      if (progress < 1) {
        requestAnimationFrame(animateTransform)
      }
    }

    requestAnimationFrame(animateTransform)
  }

  useEffect(() => {
    if (disableAutoFocus) return
    if (!refDimensions?.width) return
    if (!(children || soup || circuitJson)) return
    if (clickToInteractEnabled && !isInteractionEnabled) return

    if (!initialRenderCompleted.current) {
      resetTransform(false)
      initialRenderCompleted.current = true
    }
  }, [
    children,
    circuitJson,
    refDimensions,
    clickToInteractEnabled,
    isInteractionEnabled,
    disableAutoFocus,
  ])

  const pcbElmsPreEdit = useMemo(() => {
    return (
      circuitJson?.filter(
        (e: any) => e.type.startsWith("pcb_") || e.type.startsWith("source_"),
      ) ?? []
    )
  }, [circuitJsonKey])

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
            debugGraphics={debugGraphics}
          />
          <ToastContainer />
        </ContextProviders>
      </div>
      {clickToInteractEnabled && !isInteractionEnabled && (
        <div
          onClick={() => {
            setIsInteractionEnabled(true)
            resetTransform(true) // Animate when clicking to interact
          }}
          style={{
            position: "absolute",
            inset: 0,
            cursor: "pointer",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "16px",
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
