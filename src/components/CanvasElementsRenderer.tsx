import React, { useCallback, useState } from "react"
import { CanvasPrimitiveRenderer } from "./CanvasPrimitiveRenderer"
import { pcb_port, type AnySoupElement } from "circuit-json"
import { useMemo } from "react"
import { convertElementToPrimitives } from "../lib/convert-element-to-primitive"
import { Matrix } from "transformation-matrix"
import { GridConfig, Primitive } from "lib/types"
import { MouseElementTracker } from "./MouseElementTracker"
import { DimensionOverlay } from "./DimensionOverlay"
import { ToolbarOverlay } from "./ToolbarOverlay"
import { ErrorOverlay } from "./ErrorOverlay"
import { EditPlacementOverlay } from "./EditPlacementOverlay"
import { EditEvent } from "lib/edit-events"
import { EditTraceHintOverlay } from "./EditTraceHintOverlay"
import { RatsNestOverlay } from "./RatsNestOverlay"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { addInteractionMetadataToPrimitives } from "lib/util/addInteractionMetadataToPrimitives"

export interface CanvasElementsRendererProps {
  elements: AnySoupElement[]
  transform?: Matrix
  width?: number
  height?: number
  grid?: GridConfig
  allowEditing: boolean
  cancelPanDrag: Function
  onCreateEditEvent: (event: EditEvent) => void
  onModifyEditEvent: (event: Partial<EditEvent>) => void
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

  const [primitives, setPrimitives] = useState<Primitive[]>(
    primitivesWithoutInteractionMetadata,
  )

  return (
    <MouseElementTracker
      transform={transform}
      primitives={primitivesWithoutInteractionMetadata}
      onMouseHoverOverPrimitives={(primitivesHoveredOver) => {
        const primitiveIdsInMousedOverNet: string[] = []
        for (const primitive of primitivesHoveredOver) {
          if (primitive._element) {
            const connectedPrimitivesList = connectivityMap.getNetConnectedToId(
              "pcb_port_id" in primitive._element
                ? primitive._element?.pcb_port_id!
                : "pcb_trace_id" in primitive._element
                  ? primitive._element?.pcb_trace_id
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
        const newPrimitives = addInteractionMetadataToPrimitives({
          primitivesWithoutInteractionMetadata,
          drawingObjectIdsWithMouseOver,
          primitiveIdsInMousedOverNet,
        })

        setPrimitives(newPrimitives)
      }}
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
          <DimensionOverlay transform={transform!}>
            <ToolbarOverlay elements={elements}>
              <ErrorOverlay transform={transform} elements={elements}>
                <RatsNestOverlay transform={transform} soup={elements}>
                  <CanvasPrimitiveRenderer
                    transform={transform}
                    primitives={primitives}
                    width={props.width}
                    height={props.height}
                    grid={props.grid}
                  />
                </RatsNestOverlay>
              </ErrorOverlay>
            </ToolbarOverlay>
          </DimensionOverlay>
        </EditTraceHintOverlay>
      </EditPlacementOverlay>
    </MouseElementTracker>
  )
}
