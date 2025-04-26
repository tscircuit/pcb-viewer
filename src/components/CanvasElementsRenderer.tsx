import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import type { GraphicsObject } from "graphics-debug"
import type { GridConfig, Primitive } from "lib/types"
import { addInteractionMetadataToPrimitives } from "lib/util/addInteractionMetadataToPrimitives"
import { useCallback, useMemo, useState } from "react"
import type { Matrix } from "transformation-matrix"
import { convertElementToPrimitives } from "../lib/convert-element-to-primitive"
import { CanvasPrimitiveRenderer } from "./CanvasPrimitiveRenderer"
import { DebugGraphicsOverlay } from "./DebugGraphicsOverlay"
import { DimensionOverlay } from "./DimensionOverlay"
import { EditPlacementOverlay } from "./EditPlacementOverlay"
import { EditTraceHintOverlay } from "./EditTraceHintOverlay"
import { ErrorOverlay } from "./ErrorOverlay"
import { MouseElementTracker } from "./MouseElementTracker"
import { RatsNestOverlay } from "./RatsNestOverlay"
import { ToolbarOverlay } from "./ToolbarOverlay"
import type { ManualEditEvent } from "@tscircuit/props"

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
  const [primitivesWithoutInteractionMetadata, connectivityMap] =
    useMemo(() => {
      const primitivesWithoutInteractionMetadata = props.elements.flatMap(
        (elm) => convertElementToPrimitives(elm, props.elements),
      )
      const connectivityMap = getFullConnectivityMapFromCircuitJson(
        props.elements as any,
      )
      return [primitivesWithoutInteractionMetadata, connectivityMap]
    }, [props.elements])

  const [hoverState, setHoverState] = useState({
    drawingObjectIdsWithMouseOver: new Set<string>(),
    primitiveIdsInMousedOverNet: [] as string[],
  })

  const primitives = useMemo(() => {
    return addInteractionMetadataToPrimitives({
      primitivesWithoutInteractionMetadata,
      drawingObjectIdsWithMouseOver: hoverState.drawingObjectIdsWithMouseOver,
      primitiveIdsInMousedOverNet: hoverState.primitiveIdsInMousedOverNet,
    })
  }, [primitivesWithoutInteractionMetadata, hoverState])

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
      elements={elements}
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
          >
            <ToolbarOverlay elements={elements}>
              <ErrorOverlay transform={transform} elements={elements}>
                <RatsNestOverlay transform={transform} soup={elements}>
                  <DebugGraphicsOverlay
                    transform={transform}
                    debugGraphics={props.debugGraphics}
                  >
                    <CanvasPrimitiveRenderer
                      transform={transform}
                      primitives={primitives}
                      width={props.width}
                      height={props.height}
                      grid={props.grid}
                    />
                  </DebugGraphicsOverlay>
                </RatsNestOverlay>
              </ErrorOverlay>
            </ToolbarOverlay>
          </DimensionOverlay>
        </EditTraceHintOverlay>
      </EditPlacementOverlay>
    </MouseElementTracker>
  )
}
