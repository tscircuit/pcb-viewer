import type { AnyCircuitElement } from "circuit-json"
import {
  getBoundsFromPoints,
  type Bounds,
  type Point,
} from "@tscircuit/math-utils"
import { compose, scale, translate, type Matrix } from "transformation-matrix"

interface RoutePoint extends Point {
  width?: number
}

export interface ErrorPreviewElementIndexes {
  tracesById: Map<string, any>
  portsById: Map<string, any>
  viasById: Map<string, any>
  componentsById: Map<string, any>
  boardsById: Map<string, any>
}

export const buildErrorPreviewElementIndexes = (
  elements: AnyCircuitElement[],
): ErrorPreviewElementIndexes => {
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

const createBoundsFromCenter = (center: Point, radius = 0.45): Bounds => ({
  minX: center.x - radius,
  maxX: center.x + radius,
  minY: center.y - radius,
  maxY: center.y + radius,
})

const createBoundsFromRoute = (route: RoutePoint[]): Bounds | null => {
  if (route.length === 0) return null

  let bounds: Bounds | null = null
  for (const point of route) {
    const radius = Math.max((point.width ?? 0.2) / 2, 0.3)
    bounds = mergeBounds(bounds, createBoundsFromCenter(point, radius))
  }

  return bounds
}

const createBoundsFromComponent = (component: any): Bounds | null => {
  if (!component?.center) return null

  const width = Math.max(component.width ?? 0, 1.2)
  const height = Math.max(component.height ?? 0, 1.2)

  return {
    minX: component.center.x - width / 2,
    maxX: component.center.x + width / 2,
    minY: component.center.y - height / 2,
    maxY: component.center.y + height / 2,
  }
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

const expandBounds = (bounds: Bounds, padding: number): Bounds => ({
  minX: bounds.minX - padding,
  maxX: bounds.maxX + padding,
  minY: bounds.minY - padding,
  maxY: bounds.maxY + padding,
})

const createBoundsFromPoints = (
  points: Point[],
  radius = 0.35,
): Bounds | null => {
  const bounds = getBoundsFromPoints(points)
  if (!bounds) return null
  return expandBounds(bounds, radius)
}

const getErrorFocusCenter = ({
  error,
  tracesById,
  portsById,
  viasById,
  componentsById,
}: {
  error: any
} & ErrorPreviewElementIndexes): Point | null => {
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
      const middleIndex = Math.floor(trace.route.length / 2)
      return {
        x: trace.route[middleIndex].x,
        y: trace.route[middleIndex].y,
      }
    }
  }

  if (error.pcb_component_id) {
    return componentsById.get(error.pcb_component_id)?.center ?? null
  }

  return null
}

export const getErrorFocusPoint = ({
  error,
  indexes,
}: {
  error: any
  indexes: ErrorPreviewElementIndexes
}): Point | null =>
  getErrorFocusCenter({
    error,
    ...indexes,
  })

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

  const componentBounds = error.component_bounds
  const violationPoints: Point[] = []

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

export const getErrorPreviewBounds = ({
  error,
  indexes,
}: {
  error: any
  indexes: ErrorPreviewElementIndexes
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
    ...indexes,
  })

  if (focusCenter) {
    bounds = mergeBounds(bounds, createBoundsFromCenter(focusCenter, 0.35))
  }

  if (error.error_type === "pcb_component_outside_board_error") {
    bounds = mergeBounds(
      bounds,
      getComponentBoundaryViolationBounds({
        error,
        boardsById: indexes.boardsById,
      }),
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
      const port = indexes.portsById.get(pcbPortId)
      if (port) {
        bounds = mergeBounds(
          bounds,
          createBoundsFromCenter({ x: port.x, y: port.y }, 0.4),
        )
      }
    }
  }

  if (error.pcb_trace_id && !focusCenter) {
    const trace = indexes.tracesById.get(error.pcb_trace_id)
    if (trace?.route) {
      bounds = mergeBounds(bounds, createBoundsFromRoute(trace.route))
    }
  }

  if (error.pcb_via_ids) {
    for (const pcbViaId of error.pcb_via_ids) {
      const via = indexes.viasById.get(pcbViaId)
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
      createBoundsFromComponent(
        indexes.componentsById.get(error.pcb_component_id),
      ),
    )
  }

  if (error.pcb_component_ids && !focusCenter) {
    for (const pcbComponentId of error.pcb_component_ids) {
      bounds = mergeBounds(
        bounds,
        createBoundsFromComponent(indexes.componentsById.get(pcbComponentId)),
      )
    }
  }

  return bounds
}

export const createTransformForBounds = ({
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

export const getRelatedIdsForError = (error: any): string[] => {
  const relatedIds = new Set<string>()

  if (error.pcb_trace_id) {
    relatedIds.add(error.pcb_trace_id)
  }

  for (const pcbPortId of error.pcb_port_ids ?? []) {
    relatedIds.add(pcbPortId)
  }

  for (const pcbViaId of error.pcb_via_ids ?? []) {
    relatedIds.add(pcbViaId)
  }

  if (error.pcb_component_id) {
    relatedIds.add(error.pcb_component_id)
  }

  for (const pcbComponentId of error.pcb_component_ids ?? []) {
    relatedIds.add(pcbComponentId)
  }

  return [...relatedIds]
}
