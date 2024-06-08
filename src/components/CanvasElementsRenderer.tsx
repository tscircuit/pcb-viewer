import React, { useCallback } from "react"
import { CanvasPrimitiveRenderer } from "./CanvasPrimitiveRenderer"
import { AnyElement, AnySoupElement } from "@tscircuit/builder"
import { useMemo } from "react"
import { convertElementToPrimitives } from "../lib/convert-element-to-primitive"
import { Matrix } from "transformation-matrix"
import { GridConfig } from "lib/types"
import { MouseElementTracker } from "./MouseElementTracker"
import { DimensionOverlay } from "./DimensionOverlay"
import { ToolbarOverlay } from "./ToolbarOverlay"
import { ErrorOverlay } from "./ErrorOverlay"
import { EditPlacementOverlay } from "./EditPlacementOverlay"
import { EditEvent } from "lib/edit-events"
import { EditTraceHintOverlay } from "./EditTraceHintOverlay"

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
  const primitives = useMemo(() => {
    const primitives = props.elements.flatMap((elm) =>
      convertElementToPrimitives(elm, props.elements),
    )
    return primitives
  }, [props.elements])
  return (
    <MouseElementTracker transform={props.transform} primitives={primitives}>
      <EditPlacementOverlay
        disabled={!props.allowEditing}
        transform={props.transform}
        soup={props.elements}
        cancelPanDrag={props.cancelPanDrag}
        onCreateEditEvent={props.onCreateEditEvent}
        onModifyEditEvent={props.onModifyEditEvent}
      >
        <EditTraceHintOverlay
          disabled={!props.allowEditing}
          transform={props.transform}
          soup={props.elements}
          cancelPanDrag={props.cancelPanDrag}
          onCreateEditEvent={props.onCreateEditEvent as any}
          onModifyEditEvent={props.onModifyEditEvent as any}
        >
          <DimensionOverlay transform={props.transform!}>
            <ToolbarOverlay elements={props.elements}>
              <ErrorOverlay
                transform={props.transform}
                elements={props.elements}
              >
                <CanvasPrimitiveRenderer
                  transform={props.transform}
                  primitives={primitives}
                  width={props.width}
                  height={props.height}
                  grid={props.grid}
                />
              </ErrorOverlay>
            </ToolbarOverlay>
          </DimensionOverlay>
        </EditTraceHintOverlay>
      </EditPlacementOverlay>
    </MouseElementTracker>
  )
}
