import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import type { GraphicsObject } from "graphics-debug"
import type { GridConfig, Primitive } from "lib/types"
import { addInteractionMetadataToPrimitives } from "lib/util/addInteractionMetadataToPrimitives"
import { getErrorId } from "lib/util/get-error-id"
import {
  buildErrorPreviewElementIndexes,
  createTransformForBounds,
  getErrorPreviewBounds,
  getRelatedIdsForError,
} from "lib/util/error-preview"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type Matrix } from "transformation-matrix"
import { convertElementToPrimitives } from "lib/convert-element-to-primitive"
import { CanvasPrimitiveRenderer } from "./CanvasPrimitiveRenderer"
import { DebugGraphicsOverlay } from "./DebugGraphicsOverlay"
import { WarningGraphicsOverlay } from "./WarningGraphicsOverlay"
import { DimensionOverlay } from "./DimensionOverlay"
import { EditPlacementOverlay } from "./EditPlacementOverlay"
import { EditTraceHintOverlay } from "./EditTraceHintOverlay"
import { ErrorOverlay } from "./ErrorOverlay"
import { MouseElementTracker } from "./MouseElementTracker"
import { PcbGroupOverlay } from "./PcbGroupOverlay"
import { RatsNestOverlay } from "./RatsNestOverlay"
import { ToolbarOverlay } from "./ToolbarOverlay"
import type { ManualEditEvent } from "@tscircuit/props"
import { useGlobalStore } from "../global-store"

export interface CanvasElementsRendererProps {
  elements: AnyCircuitElement[]
  debugGraphics?: GraphicsObject | null
  transform?: Matrix
  setTransform?: (transform: Matrix) => void
  width?: number
  height?: number
  grid?: GridConfig
  allowEditing: boolean
  focusOnHover?: boolean
  cancelPanDrag: () => void
  onCreateEditEvent: (event: ManualEditEvent) => void
  onModifyEditEvent: (event: Partial<ManualEditEvent>) => void
}

const interpolateTransform = (
  start: Matrix,
  end: Matrix,
  progress: number,
): Matrix => ({
  a: start.a + (end.a - start.a) * progress,
  b: start.b + (end.b - start.b) * progress,
  c: start.c + (end.c - start.c) * progress,
  d: start.d + (end.d - start.d) * progress,
  e: start.e + (end.e - start.e) * progress,
  f: start.f + (end.f - start.f) * progress,
})

export const CanvasElementsRenderer = (props: CanvasElementsRendererProps) => {
  const { transform, elements } = props
  const { hoveredErrorId, focusedErrorId, isShowingCopperPours } =
    useGlobalStore((state) => ({
      hoveredErrorId: state.hovered_error_id,
      focusedErrorId: state.focused_error_id,
      isShowingCopperPours: state.is_showing_copper_pours,
    }))
  const activeErrorId = focusedErrorId ?? hoveredErrorId

  const elementsToRender = useMemo(
    () =>
      isShowingCopperPours
        ? elements
        : elements.filter((elm) => elm.type !== "pcb_copper_pour"),
    [elements, isShowingCopperPours],
  )

  const [primitivesWithoutInteractionMetadata, connectivityMap] =
    useMemo(() => {
      const primitivesWithoutInteractionMetadata = elementsToRender.flatMap(
        (elm) => convertElementToPrimitives(elm, props.elements),
      )
      const connectivityMap = getFullConnectivityMapFromCircuitJson(
        props.elements as any,
      )
      return [primitivesWithoutInteractionMetadata, connectivityMap]
    }, [elementsToRender, props.elements])

  const [hoverState, setHoverState] = useState({
    drawingObjectIdsWithMouseOver: new Set<string>(),
    primitiveIdsInMousedOverNet: [] as string[],
  })
  const [hoveredComponentIds, setHoveredComponentIds] = useState<string[]>([])
  const currentTransformRef = useRef<Matrix | null>(transform ?? null)
  const zoomAnimationFrameRef = useRef<number | null>(null)

  const elementIndexes = useMemo(
    () => buildErrorPreviewElementIndexes(elements),
    [elements],
  )

  const errorRelatedIds = useMemo(() => {
    if (!activeErrorId) return []

    const errorElements = elements.filter((el): el is any =>
      el.type.includes("error"),
    )

    const activeError = errorElements.find((el, index) => {
      return getErrorId(el, index) === activeErrorId
    })

    if (!activeError) return []

    return getRelatedIdsForError(activeError)
  }, [activeErrorId, elements])

  useEffect(() => {
    if (transform) {
      currentTransformRef.current = transform
    }
  }, [transform])

  useEffect(() => {
    return () => {
      if (zoomAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(zoomAnimationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!props.width || !props.height || !props.setTransform || !focusedErrorId)
      return

    const errorElements = elements.filter((el: any) =>
      el.type.includes("error"),
    )
    const focusedError = errorElements.find((el, index) => {
      return getErrorId(el, index) === focusedErrorId
    })

    if (!focusedError) return

    const previewBounds = getErrorPreviewBounds({
      error: focusedError,
      indexes: elementIndexes,
    })

    if (!previewBounds) return

    const startTransform = currentTransformRef.current ?? transform
    if (!startTransform) return

    const targetTransform = createTransformForBounds({
      bounds: previewBounds,
      width: props.width,
      height: props.height,
    })

    if (zoomAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(zoomAnimationFrameRef.current)
    }

    const startTime = performance.now()
    const durationMs = 420

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime
      const rawProgress = Math.min(1, elapsed / durationMs)
      const easedProgress = 1 - (1 - rawProgress) ** 3
      const nextTransform = interpolateTransform(
        startTransform,
        targetTransform,
        easedProgress,
      )

      currentTransformRef.current = nextTransform
      props.setTransform?.(nextTransform)

      if (rawProgress < 1) {
        zoomAnimationFrameRef.current = window.requestAnimationFrame(animate)
      } else {
        zoomAnimationFrameRef.current = null
      }
    }

    zoomAnimationFrameRef.current = window.requestAnimationFrame(animate)
  }, [
    focusedErrorId,
    elements,
    elementIndexes,
    props.height,
    props.setTransform,
    props.width,
  ])

  const primitives = useMemo(() => {
    const combinedPrimitiveIds = [
      ...hoverState.primitiveIdsInMousedOverNet,
      ...errorRelatedIds,
    ]

    return addInteractionMetadataToPrimitives({
      primitivesWithoutInteractionMetadata,
      drawingObjectIdsWithMouseOver: hoverState.drawingObjectIdsWithMouseOver,
      primitiveIdsInMousedOverNet: combinedPrimitiveIds,
    })
  }, [primitivesWithoutInteractionMetadata, hoverState, errorRelatedIds])

  const onMouseOverPrimitives = useCallback(
    (primitivesHoveredOver: Primitive[]) => {
      const primitiveIdsInMousedOverNet: string[] = []
      for (const primitive of primitivesHoveredOver) {
        if (primitive._element) {
          const connectedPrimitivesList = connectivityMap.getNetConnectedToId(
            "pcb_port_id" in primitive._element
              ? primitive._element?.pcb_port_id!
              : "pcb_trace_id" in primitive._element
                ? primitive._element?.pcb_trace_id!
                : "",
          )
          primitiveIdsInMousedOverNet.push(
            ...connectivityMap.getIdsConnectedToNet(connectedPrimitivesList!),
          )
        }
      }

      const drawingObjectIdsWithMouseOver = new Set(
        primitivesHoveredOver.map((p) => p._pcb_drawing_object_id),
      )

      setHoverState({
        drawingObjectIdsWithMouseOver,
        primitiveIdsInMousedOverNet,
      })

      const componentIds = primitivesHoveredOver
        .map((primitive) => {
          if (
            primitive._parent_pcb_component?.type === "pcb_component" &&
            primitive._parent_pcb_component.pcb_component_id
          ) {
            return primitive._parent_pcb_component.pcb_component_id
          }
          if (
            primitive._element?.type === "pcb_component" &&
            primitive._element.pcb_component_id
          ) {
            return primitive._element.pcb_component_id
          }
          return null
        })
        .filter((id): id is string => Boolean(id))

      setHoveredComponentIds(Array.from(new Set(componentIds)))
    },
    [connectivityMap],
  )

  return (
    <MouseElementTracker
      elements={elementsToRender}
      transform={transform}
      primitives={primitivesWithoutInteractionMetadata}
      onMouseHoverOverPrimitives={onMouseOverPrimitives}
    >
      <EditPlacementOverlay
        disabled={!props.allowEditing}
        transform={transform}
        soup={elements}
        cancelPanDrag={props.cancelPanDrag}
        onCreateEditEvent={props.onCreateEditEvent}
        onModifyEditEvent={props.onModifyEditEvent}
      >
        <EditTraceHintOverlay
          disabled={!props.allowEditing}
          transform={transform}
          soup={elements}
          cancelPanDrag={props.cancelPanDrag}
          onCreateEditEvent={props.onCreateEditEvent as any}
          onModifyEditEvent={props.onModifyEditEvent as any}
        >
          <DimensionOverlay
            transform={transform!}
            focusOnHover={props.focusOnHover}
            primitives={primitivesWithoutInteractionMetadata}
          >
            <ToolbarOverlay elements={elements}>
              <ErrorOverlay transform={transform} elements={elements}>
                <RatsNestOverlay transform={transform} soup={elements}>
                  <PcbGroupOverlay
                    transform={transform}
                    elements={elements}
                    hoveredComponentIds={hoveredComponentIds}
                  >
                    <DebugGraphicsOverlay
                      transform={transform}
                      debugGraphics={props.debugGraphics}
                    >
                      <WarningGraphicsOverlay
                        transform={transform}
                        elements={elements}
                      >
                        <CanvasPrimitiveRenderer
                          transform={transform}
                          primitives={primitives}
                          elements={elementsToRender}
                          width={props.width}
                          height={props.height}
                          grid={props.grid}
                        />
                      </WarningGraphicsOverlay>
                    </DebugGraphicsOverlay>
                  </PcbGroupOverlay>
                </RatsNestOverlay>
              </ErrorOverlay>
            </ToolbarOverlay>
          </DimensionOverlay>
        </EditTraceHintOverlay>
      </EditPlacementOverlay>
    </MouseElementTracker>
  )
}
