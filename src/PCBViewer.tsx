import { applyEditEvents } from "@tscircuit/core"
import { findBoundsAndCenter } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, SourceTrace } from "circuit-json"
import { ContextProviders } from "./components/ContextProviders"
import type { StateProps } from "./global-store"
import type { GraphicsObject } from "graphics-debug"
import { ToastContainer } from "lib/toast"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMeasure } from "react-use"
import { compose, scale, translate } from "transformation-matrix"
import useMouseMatrixTransform from "use-mouse-matrix-transform"
import { CanvasElementsRenderer } from "./components/CanvasElementsRenderer"
import type { ManualEditEvent } from "@tscircuit/props"
import { zIndexMap } from "lib/util/z-index-map"
import { calculateCircuitJsonKey } from "lib/calculate-circuit-json-key"
import { calculateBoardSizeKey } from "lib/calculate-board-size-key"

const defaultTransform = compose(translate(400, 300), scale(40, -40))

export interface BoardSizeEdit {
  width: number
  height: number
  center: { x: number; y: number }
}

type Props = {
  circuitJson?: AnyCircuitElement[]
  height?: number
  allowEditing?: boolean
  editEvents?: ManualEditEvent[]
  initialState?: Partial<StateProps>
  onEditEventsChanged?: (editEvents: ManualEditEvent[]) => void
  onBoardSizeChanged?: (boardSize: BoardSizeEdit) => void
  focusOnHover?: boolean
  clickToInteractEnabled?: boolean
  debugGraphics?: GraphicsObject | null
  disablePcbGroups?: boolean
}

export const PCBViewer = ({
  circuitJson,
  debugGraphics,
  height = 600,
  initialState,
  allowEditing = true,
  editEvents: editEventsProp,
  onEditEventsChanged,
  onBoardSizeChanged,
  focusOnHover = false,
  clickToInteractEnabled = false,
  disablePcbGroups = false,
}: Props) => {
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

  let [editEvents, setEditEvents] = useState<ManualEditEvent[]>([])
  editEvents = editEventsProp ?? editEvents

  const initialRenderCompleted = useRef(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const circuitJsonKey = useMemo(
    () => calculateCircuitJsonKey(circuitJson),
    [circuitJson],
  )
  const boardSizeKey = calculateBoardSizeKey(circuitJson)

  // Board size override state (viewer-local, applied on top of edit events)
  const [boardSizeOverride, setBoardSizeOverride] =
    useState<BoardSizeEdit | null>(null)

  // Reset board size override when circuit JSON changes
  useEffect(() => {
    setBoardSizeOverride(null)
  }, [circuitJsonKey])

  const pcbElmsPreEdit = useMemo(() => {
    return (
      circuitJson?.filter(
        (e: any) => e.type.startsWith("pcb_") || e.type.startsWith("source_"),
      ) ?? []
    )
  }, [circuitJsonKey])

  const elementsAfterEditEvents = useMemo(() => {
    return applyEditEvents({
      circuitJson: pcbElmsPreEdit as any,
      editEvents,
    })
  }, [pcbElmsPreEdit, editEvents])

  // Apply board size override on top of the core edit events
  const elements = useMemo(() => {
    if (!boardSizeOverride)
      return elementsAfterEditEvents as AnyCircuitElement[]
    return (elementsAfterEditEvents as AnyCircuitElement[]).map((el) => {
      if (el.type === "pcb_board") {
        return {
          ...el,
          width: boardSizeOverride.width,
          height: boardSizeOverride.height,
          center: boardSizeOverride.center,
        }
      }
      return el
    })
  }, [elementsAfterEditEvents, boardSizeOverride])

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

    const targetTransform = compose(
      translate((elmBounds.width ?? 0) / 2, (elmBounds.height ?? 0) / 2),
      scale(scaleFactor, -scaleFactor, 0, 0),
      translate(-center.x, -center.y),
    )

    setTransform(targetTransform)
    return
  }

  useEffect(() => {
    if (!refDimensions?.width) return
    if (!circuitJson) return
    if (circuitJson.length === 0) return

    if (!initialRenderCompleted.current) {
      resetTransform()
      initialRenderCompleted.current = true
    }
  }, [circuitJson, refDimensions])

  useEffect(() => {
    if (initialRenderCompleted.current === true) {
      resetTransform()
    }
  }, [boardSizeKey])

  const onCreateEditEvent = (event: ManualEditEvent) => {
    setEditEvents([...editEvents, event])
    onEditEventsChanged?.([...editEvents, event])
  }
  const onModifyEditEvent = (modifiedEvent: Partial<ManualEditEvent>) => {
    const newEditEvents: ManualEditEvent[] = editEvents.map((e) =>
      e.edit_event_id === modifiedEvent.edit_event_id
        ? ({ ...e, ...modifiedEvent } as ManualEditEvent)
        : e,
    )
    setEditEvents(newEditEvents)
    onEditEventsChanged?.(newEditEvents)
  }

  const handleBoardSizeEdit = useCallback(
    (edit: BoardSizeEdit) => {
      setBoardSizeOverride(edit)
      onBoardSizeChanged?.(edit)
    },
    [onBoardSizeChanged],
  )

  const mergedInitialState = useMemo(
    () => ({
      ...initialState,
      ...(disablePcbGroups && { is_showing_pcb_groups: false }),
    }),
    [initialState, disablePcbGroups],
  )

  return (
    <div
      ref={transformRef as any}
      style={{ position: "relative" }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div ref={ref as any}>
        <ContextProviders
          initialState={mergedInitialState}
          disablePcbGroups={disablePcbGroups}
        >
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
            onBoardSizeEdit={handleBoardSizeEdit}
            grid={{
              spacing: 1,
              view_window: {
                left: 0,
                right: refDimensions.width || 500,
                top: height,
                bottom: 0,
              },
            }}
            elements={elements as SourceTrace[]}
            debugGraphics={debugGraphics}
          />
          <ToastContainer />
        </ContextProviders>
      </div>
      {clickToInteractEnabled && !isInteractionEnabled && (
        <div
          onClick={() => {
            setIsInteractionEnabled(true)
            resetTransform()
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0]
            touchStartRef.current = {
              x: touch.clientX,
              y: touch.clientY,
            }
          }}
          onTouchEnd={(e) => {
            const touch = e.changedTouches[0]
            const start = touchStartRef.current
            if (!start) return

            const deltaX = Math.abs(touch.clientX - start.x)
            const deltaY = Math.abs(touch.clientY - start.y)

            if (deltaX < 10 && deltaY < 10) {
              e.preventDefault()
              setIsInteractionEnabled(true)
              resetTransform()
            }

            touchStartRef.current = null
          }}
          style={{
            position: "absolute",
            inset: 0,
            cursor: "pointer",
            zIndex: zIndexMap.clickToInteractOverlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "pan-x pan-y pinch-zoom",
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
            {typeof window !== "undefined" &&
            ("ontouchstart" in window || navigator.maxTouchPoints > 0)
              ? "Touch to Interact"
              : "Click to Interact"}
          </div>
        </div>
      )}
    </div>
  )
}
