import React, { useCallback, useState } from "react"
import { CanvasPrimitiveRenderer } from "./CanvasPrimitiveRenderer"
import { pcb_port, type AnySoupElement } from "@tscircuit/soup"
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
        props.elements,
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
        const connectedPrimitiveIds: string[] = []
        for (const primitive of primitivesHoveredOver) {
          if (primitive._element && "pcb_port_id" in primitive._element) {
            const connectedPrimitivesList = connectivityMap.getNetConnectedToId(
              primitive._element.pcb_port_id!,
            )
            connectedPrimitiveIds.push(
              ...connectivityMap.getIdsConnectedToNet(connectedPrimitivesList!),
            )
          }
        }

        const primitiveIdsWithMouseOver = new Set(
          primitivesHoveredOver.map((p) => p._pcb_drawing_object_id),
        )
        const newPrimitives = []
        for (const primitive of primitivesWithoutInteractionMetadata) {
          const newPrimitive = { ...primitive }
          if (primitiveIdsWithMouseOver.has(primitive._pcb_drawing_object_id)) {
            newPrimitive.is_mouse_over = true
          } else if (
            primitive._element &&
            (("pcb_trace_id" in primitive._element &&
              connectedPrimitiveIds.includes(
                primitive._element.pcb_trace_id,
              )) ||
              ("pcb_port_id" in primitive._element &&
                connectedPrimitiveIds.includes(
                  primitive._element.pcb_port_id!,
                )))
          ) {
            newPrimitive.is_in_highlighted_net = true
          } else {
            newPrimitive.is_in_highlighted_net = false
            newPrimitive.is_mouse_over = false
          }
          newPrimitives.push(newPrimitive)
        }

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
