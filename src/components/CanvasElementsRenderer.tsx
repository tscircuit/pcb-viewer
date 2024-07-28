import React, { useCallback } from "react"
import { CanvasPrimitiveRenderer } from "./CanvasPrimitiveRenderer"
import type { AnySoupElement } from "@tscircuit/soup"
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
import { RatsNestOverlay } from "./RatsNestOverlay"

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
  const primitives = useMemo(() => {
    const primitives = props.elements.flatMap((elm) =>
      convertElementToPrimitives(elm, props.elements),
    )
    return primitives
  }, [props.elements])
  return (
    <MouseElementTracker transform={transform} primitives={primitives}>
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
