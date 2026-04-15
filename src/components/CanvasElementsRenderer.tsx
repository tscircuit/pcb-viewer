import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import type { GraphicsObject } from "graphics-debug"
import type { GridConfig, Primitive } from "lib/types"
import { addInteractionMetadataToPrimitives } from "lib/util/addInteractionMetadataToPrimitives"
import { getErrorId } from "lib/util/get-error-id"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { compose, scale, translate, type Matrix } from "transformation-matrix"
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

interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

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

const mergeBounds = (
  existing: Bounds | null,
  next: Bounds | null | undefined,
): Bounds | null => {
  if (!next) return existing
  if (!existing) return next

  return {
    minX: Math.min(existing.minX, next.minX),
    maxX: Math.max(existing.maxX, next.maxX),
    minY: Math.min(existing.minY, next.minY),
    maxY: Math.max(existing.maxY, next.maxY),
  }
}

const createBoundsFromCenter = (
  center: { x: number; y: number },
  radius = 0.45,
): Bounds => ({
  minX: center.x - radius,
  maxX: center.x + radius,
  minY: center.y - radius,
  maxY: center.y + radius,
})

const createBoundsFromRoute = (
  route: Array<{ x: number; y: number; width?: number }>,
): Bounds | null => {
  if (route.length === 0) return null

  let bounds: Bounds | null = null
  for (const point of route) {
    const radius = Math.max((point.width ?? 0.2) / 2, 0.3)
    bounds = mergeBounds(
      bounds,
      createBoundsFromCenter({ x: point.x, y: point.y }, radius),
    )
  }

  return bounds
}

const createBoundsFromComponent = (component: any): Bounds | null => {
  if (component?.center) {
    const width = Math.max(component.width ?? 0, 1.2)
    const height = Math.max(component.height ?? 0, 1.2)
    return {
      minX: component.center.x - width / 2,
      maxX: component.center.x + width / 2,
      minY: component.center.y - height / 2,
      maxY: component.center.y + height / 2,
    }
  }

  return null
}

const createBoardBounds = (board: any): Bounds | null => {
  if (
    !board?.center ||
    typeof board.width !== "number" ||
    typeof board.height !== "number"
  ) {
    return null
  }

  return {
    minX: board.center.x - board.width / 2,
    maxX: board.center.x + board.width / 2,
    minY: board.center.y - board.height / 2,
    maxY: board.center.y + board.height / 2,
  }
}

const createBoundsFromPoints = (
  points: Array<{ x: number; y: number }>,
  radius = 0.35,
): Bounds | null => {
  let bounds: Bounds | null = null
  for (const point of points) {
    bounds = mergeBounds(bounds, createBoundsFromCenter(point, radius))
  }
  return bounds
}

const getErrorFocusCenter = ({
  error,
  tracesById,
  portsById,
  viasById,
  componentsById,
}: {
  error: any
  tracesById: Map<string, any>
  portsById: Map<string, any>
  viasById: Map<string, any>
  componentsById: Map<string, any>
}) => {
  if (error.center) return error.center
  if (error.pcb_center) return error.pcb_center
  if (error.component_center) return error.component_center

  if (error.pcb_via_ids?.length) {
    const vias = error.pcb_via_ids
      .map((pcbViaId: string) => viasById.get(pcbViaId))
      .filter(Boolean)
    if (vias.length > 0) {
      return {
        x: vias.reduce((sum: number, via: any) => sum + via.x, 0) / vias.length,
        y: vias.reduce((sum: number, via: any) => sum + via.y, 0) / vias.length,
      }
    }
  }

  if (error.pcb_port_ids?.length) {
    const ports = error.pcb_port_ids
      .map((pcbPortId: string) => portsById.get(pcbPortId))
      .filter(Boolean)
    if (ports.length > 0) {
      return {
        x:
          ports.reduce((sum: number, port: any) => sum + port.x, 0) /
          ports.length,
        y:
          ports.reduce((sum: number, port: any) => sum + port.y, 0) /
          ports.length,
      }
    }
  }

  if (error.pcb_trace_id) {
    const trace = tracesById.get(error.pcb_trace_id)
    if (trace?.route?.length) {
      const mid = Math.floor(trace.route.length / 2)
      return {
        x: trace.route[mid].x,
        y: trace.route[mid].y,
      }
    }
  }

  if (error.pcb_component_id) {
    return componentsById.get(error.pcb_component_id)?.center ?? null
  }

  return null
}

const getComponentBoundaryViolationBounds = ({
  error,
  boardsById,
}: {
  error: any
  boardsById: Map<string, any>
}): Bounds | null => {
  if (!error.component_bounds || !error.pcb_board_id) return null

  const boardBounds = createBoardBounds(boardsById.get(error.pcb_board_id))
  if (!boardBounds) return null

  const violationPoints: Array<{ x: number; y: number }> = []
  const componentBounds = error.component_bounds

  if (componentBounds.min_x < boardBounds.minX) {
    violationPoints.push({
      x: boardBounds.minX,
      y: Math.max(componentBounds.min_y, boardBounds.minY),
    })
    violationPoints.push({
      x: boardBounds.minX,
      y: Math.min(componentBounds.max_y, boardBounds.maxY),
    })
  }

  if (componentBounds.max_x > boardBounds.maxX) {
    violationPoints.push({
      x: boardBounds.maxX,
      y: Math.max(componentBounds.min_y, boardBounds.minY),
    })
    violationPoints.push({
      x: boardBounds.maxX,
      y: Math.min(componentBounds.max_y, boardBounds.maxY),
    })
  }

  if (componentBounds.min_y < boardBounds.minY) {
    violationPoints.push({
      x: Math.max(componentBounds.min_x, boardBounds.minX),
      y: boardBounds.minY,
    })
    violationPoints.push({
      x: Math.min(componentBounds.max_x, boardBounds.maxX),
      y: boardBounds.minY,
    })
  }

  if (componentBounds.max_y > boardBounds.maxY) {
    violationPoints.push({
      x: Math.max(componentBounds.min_x, boardBounds.minX),
      y: boardBounds.maxY,
    })
    violationPoints.push({
      x: Math.min(componentBounds.max_x, boardBounds.maxX),
      y: boardBounds.maxY,
    })
  }

  return createBoundsFromPoints(violationPoints, 0.3)
}

const nonZoomableErrorTypes = new Set([
  "source_failed_to_create_component_error",
])

const getErrorPreviewBounds = ({
  error,
  tracesById,
  portsById,
  viasById,
  componentsById,
  boardsById,
}: {
  error: any
  tracesById: Map<string, any>
  portsById: Map<string, any>
  viasById: Map<string, any>
  componentsById: Map<string, any>
  boardsById: Map<string, any>
}): Bounds | null => {
  if (
    nonZoomableErrorTypes.has(error.error_type) ||
    nonZoomableErrorTypes.has(error.type)
  ) {
    return null
  }

  let bounds: Bounds | null = null
  const focusCenter = getErrorFocusCenter({
    error,
    tracesById,
    portsById,
    viasById,
    componentsById,
  })

  if (focusCenter) {
    bounds = mergeBounds(bounds, createBoundsFromCenter(focusCenter, 0.35))
  }

  if (error.error_type === "pcb_component_outside_board_error") {
    bounds = mergeBounds(
      bounds,
      getComponentBoundaryViolationBounds({ error, boardsById }),
    )
  } else if (error.component_bounds && !focusCenter) {
    bounds = mergeBounds(bounds, {
      minX: error.component_bounds.min_x,
      maxX: error.component_bounds.max_x,
      minY: error.component_bounds.min_y,
      maxY: error.component_bounds.max_y,
    })
  }

  if (error.center && !focusCenter) {
    bounds = mergeBounds(bounds, createBoundsFromCenter(error.center))
  }

  if (error.pcb_center && !focusCenter) {
    bounds = mergeBounds(bounds, createBoundsFromCenter(error.pcb_center))
  }

  if (error.component_center && !focusCenter) {
    bounds = mergeBounds(bounds, createBoundsFromCenter(error.component_center))
  }

  if (error.pcb_port_ids && !focusCenter) {
    for (const pcbPortId of error.pcb_port_ids) {
      const port = portsById.get(pcbPortId)
      if (port) {
        bounds = mergeBounds(
          bounds,
          createBoundsFromCenter({ x: port.x, y: port.y }, 0.4),
        )
      }
    }
  }

  if (error.pcb_trace_id && !focusCenter) {
    const trace = tracesById.get(error.pcb_trace_id)
    if (trace?.route) {
      bounds = mergeBounds(bounds, createBoundsFromRoute(trace.route))
    }
  }

  if (error.pcb_via_ids) {
    for (const pcbViaId of error.pcb_via_ids) {
      const via = viasById.get(pcbViaId)
      if (via) {
        bounds = mergeBounds(
          bounds,
          createBoundsFromCenter(
            { x: via.x, y: via.y },
            Math.max((via.outer_diameter ?? 0.5) / 2, 0.28),
          ),
        )
      }
    }
  }

  if (error.pcb_component_id && !focusCenter) {
    bounds = mergeBounds(
      bounds,
      createBoundsFromComponent(componentsById.get(error.pcb_component_id)),
    )
  }

  if (error.pcb_component_ids && !focusCenter) {
    for (const pcbComponentId of error.pcb_component_ids) {
      bounds = mergeBounds(
        bounds,
        createBoundsFromComponent(componentsById.get(pcbComponentId)),
      )
    }
  }

  return bounds
}

const createTransformForBounds = ({
  bounds,
  width,
  height,
}: {
  bounds: Bounds
  width: number
  height: number
}): Matrix => {
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
  const targetWidth = Math.max(bounds.maxX - bounds.minX, 0.8) + 1.4
  const targetHeight = Math.max(bounds.maxY - bounds.minY, 0.8) + 1.4
  const scaleFactor =
    Math.min(width / targetWidth, height / targetHeight, 240) * 0.92

  return compose(
    translate(width / 2, height / 2),
    scale(scaleFactor, -scaleFactor, 0, 0),
    translate(-center.x, -center.y),
  )
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

  const elementIndexes = useMemo(() => {
    const tracesById = new Map<string, any>()
    const portsById = new Map<string, any>()
    const viasById = new Map<string, any>()
    const componentsById = new Map<string, any>()
    const boardsById = new Map<string, any>()

    for (const element of elements) {
      if (element.type === "pcb_trace" && element.pcb_trace_id) {
        tracesById.set(element.pcb_trace_id, element)
      } else if (element.type === "pcb_port" && element.pcb_port_id) {
        portsById.set(element.pcb_port_id, element)
      } else if (element.type === "pcb_via" && element.pcb_via_id) {
        viasById.set(element.pcb_via_id, element)
      } else if (element.type === "pcb_component" && element.pcb_component_id) {
        componentsById.set(element.pcb_component_id, element)
      } else if (element.type === "pcb_board" && element.pcb_board_id) {
        boardsById.set(element.pcb_board_id, element)
      }
    }

    return {
      tracesById,
      portsById,
      viasById,
      componentsById,
      boardsById,
    }
  }, [elements])

  const errorRelatedIds = useMemo(() => {
    if (!activeErrorId) return []

    const errorElements = elements.filter((el): el is any =>
      el.type.includes("error"),
    )

    const activeError = errorElements.find((el, index) => {
      return getErrorId(el, index) === activeErrorId
    })

    if (!activeError) return []

    const relatedIds: string[] = []

    if (activeError.pcb_trace_id) {
      relatedIds.push(activeError.pcb_trace_id)
    }

    if (activeError.pcb_port_ids) {
      relatedIds.push(...activeError.pcb_port_ids)
    }
    if (activeError.pcb_via_ids) {
      relatedIds.push(...activeError.pcb_via_ids)
    }

    if (activeError.pcb_via_ids) {
      relatedIds.push(...activeError.pcb_via_ids)
    }

    if (activeError.pcb_component_id) {
      relatedIds.push(activeError.pcb_component_id)
    }

    if (activeError.pcb_component_ids) {
      relatedIds.push(...activeError.pcb_component_ids)
    }

    return relatedIds
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
      ...elementIndexes,
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
