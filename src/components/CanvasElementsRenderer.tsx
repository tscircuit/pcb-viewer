import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import type { GraphicsObject } from "graphics-debug"
import type { GridConfig, Primitive } from "lib/types"
import { addInteractionMetadataToPrimitives } from "lib/util/addInteractionMetadataToPrimitives"
import { useCallback, useMemo, useState } from "react"
import type { Matrix } from "transformation-matrix"
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
  width?: number
  height?: number
  grid?: GridConfig
  allowEditing: boolean
  focusOnHover?: boolean
  cancelPanDrag: () => void
  onCreateEditEvent: (event: ManualEditEvent) => void
  onModifyEditEvent: (event: Partial<ManualEditEvent>) => void
}

export const CanvasElementsRenderer = (props: CanvasElementsRendererProps) => {
  const { transform, elements } = props
  const hoveredErrorId = useGlobalStore((state) => state.hovered_error_id)
  const isShowingCopperPours = useGlobalStore(
    (state) => state.is_showing_copper_pours,
  )

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

  const errorRelatedIds = useMemo(() => {
    if (!hoveredErrorId) return []

    const errorElements = elements.filter((el): el is any =>
      el.type.includes("error"),
    )

    const hoveredError = errorElements.find((el, index) => {
      const errorId =
        el.pcb_trace_error_id ||
        `error_${index}_${el.error_type}_${el.message?.slice(0, 20)}`
      return errorId === hoveredErrorId
    })

    if (!hoveredError) return []

    const relatedIds: string[] = []

    if (hoveredError.pcb_trace_id) {
      relatedIds.push(hoveredError.pcb_trace_id)
    }

    if (hoveredError.pcb_port_ids) {
      relatedIds.push(...hoveredError.pcb_port_ids)
    }

    return relatedIds
  }, [hoveredErrorId, elements])

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
                  <PcbGroupOverlay transform={transform} elements={elements}>
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
