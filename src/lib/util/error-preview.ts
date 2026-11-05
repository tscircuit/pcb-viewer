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
  smtpadsById?: Map<string, any>
  platedHolesById?: Map<string, any>
  componentsById: Map<string, any>
  boardsById: Map<string, any>
}

export const buildErrorPreviewElementIndexes = (
  elements: AnyCircuitElement[],
): ErrorPreviewElementIndexes => {
  const tracesById = new Map<string, any>()
  const portsById = new Map<string, any>()
  const viasById = new Map<string, any>()
  const smtpadsById = new Map<string, any>()
  const platedHolesById = new Map<string, any>()
  const componentsById = new Map<string, any>()
  const boardsById = new Map<string, any>()

  for (const element of elements) {
    if (element.type === "pcb_trace" && element.pcb_trace_id) {
      tracesById.set(element.pcb_trace_id, element)
    } else if (element.type === "pcb_port" && element.pcb_port_id) {
      portsById.set(element.pcb_port_id, element)
    } else if (element.type === "pcb_via" && element.pcb_via_id) {
      viasById.set(element.pcb_via_id, element)
    } else if (element.type === "pcb_smtpad" && element.pcb_smtpad_id) {
      smtpadsById.set(element.pcb_smtpad_id, element)
    } else if (
      element.type === "pcb_plated_hole" &&
      element.pcb_plated_hole_id
    ) {
      platedHolesById.set(element.pcb_plated_hole_id, element)
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
    smtpadsById,
    platedHolesById,
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
  if (Array.isArray(board?.outline) && board.outline.length > 0) {
    return getBoundsFromPoints(board.outline)
  }

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

const getElementCenter = (element: any): Point | null => {
  if (!element) return null
  if (typeof element.x === "number" && typeof element.y === "number") {
    return { x: element.x, y: element.y }
  }
  if (element.center) return element.center
  if (Array.isArray(element.points) && element.points.length > 0) {
    const bounds = getBoundsFromPoints(element.points)
    if (bounds) {
      return {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      }
    }
  }
  return null
}

const createBoundsFromPadOrHole = (element: any): Bounds | null => {
  if (!element) return null
  if (Array.isArray(element.points) && element.points.length > 0) {
    return createBoundsFromPoints(element.points, 0.25)
  }
  const center = getElementCenter(element)
  if (!center) return null
  const width =
    element.width ??
    element.outer_width ??
    element.rect_pad_width ??
    element.outer_diameter ??
    (typeof element.radius === "number" ? element.radius * 2 : 0.6)
  const height =
    element.height ??
    element.outer_height ??
    element.rect_pad_height ??
    element.outer_diameter ??
    (typeof element.radius === "number" ? element.radius * 2 : 0.6)
  const halfWidth = Math.max(width / 2, 0.3)
  const halfHeight = Math.max(height / 2, 0.3)
  return {
    minX: center.x - halfWidth,
    maxX: center.x + halfWidth,
    minY: center.y - halfHeight,
    maxY: center.y + halfHeight,
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
  smtpadsById = new Map(),
  platedHolesById = new Map(),
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

  const smtpadIds = [
    ...(error.pcb_smtpad_id ? [error.pcb_smtpad_id] : []),
    ...(error.pcb_smtpad_ids ?? []),
  ]
  if (smtpadIds.length > 0) {
    const padCenters = smtpadIds
      .map((id: string) => getElementCenter(smtpadsById.get(id)))
      .filter((pt): pt is Point => pt !== null)
    if (padCenters.length > 0) {
      return {
        x: padCenters.reduce((sum, pt) => sum + pt.x, 0) / padCenters.length,
        y: padCenters.reduce((sum, pt) => sum + pt.y, 0) / padCenters.length,
      }
    }
  }

  const platedHoleIds = [
    ...(error.pcb_plated_hole_id ? [error.pcb_plated_hole_id] : []),
    ...(error.pcb_plated_hole_ids ?? []),
  ]
  if (platedHoleIds.length > 0) {
    const holeCenters = platedHoleIds
      .map((id: string) => getElementCenter(platedHolesById.get(id)))
      .filter((pt): pt is Point => pt !== null)
    if (holeCenters.length > 0) {
      return {
        x: holeCenters.reduce((sum, pt) => sum + pt.x, 0) / holeCenters.length,
        y: holeCenters.reduce((sum, pt) => sum + pt.y, 0) / holeCenters.length,
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

  const traceIds = [
    ...(error.pcb_trace_id ? [error.pcb_trace_id] : []),
    ...(error.pcb_trace_ids ?? []),
  ]
  for (const traceId of traceIds) {
    const trace = tracesById.get(traceId)
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

  if (error.pcb_component_ids?.length) {
    const components = error.pcb_component_ids
      .map((id: string) => componentsById.get(id))
      .filter((comp: any) => Boolean(comp?.center))
    if (components.length > 0) {
      return {
        x:
          components.reduce(
            (sum: number, comp: any) => sum + comp.center.x,
            0,
          ) / components.length,
        y:
          components.reduce(
            (sum: number, comp: any) => sum + comp.center.y,
            0,
          ) / components.length,
      }
    }
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

  if (error.pcb_trace_ids && !focusCenter) {
    for (const pcbTraceId of error.pcb_trace_ids) {
      const trace = indexes.tracesById.get(pcbTraceId)
      if (trace?.route) {
        bounds = mergeBounds(bounds, createBoundsFromRoute(trace.route))
      }
    }
  }

  const smtpadIds = [
    ...(error.pcb_smtpad_id ? [error.pcb_smtpad_id] : []),
    ...(error.pcb_smtpad_ids ?? []),
  ]
  for (const pcbSmtpadId of smtpadIds) {
    const pad = indexes.smtpadsById?.get(pcbSmtpadId)
    if (pad) {
      bounds = mergeBounds(bounds, createBoundsFromPadOrHole(pad))
    }
  }

  const platedHoleIds = [
    ...(error.pcb_plated_hole_id ? [error.pcb_plated_hole_id] : []),
    ...(error.pcb_plated_hole_ids ?? []),
  ]
  for (const pcbPlatedHoleId of platedHoleIds) {
    const hole = indexes.platedHolesById?.get(pcbPlatedHoleId)
    if (hole) {
      bounds = mergeBounds(bounds, createBoundsFromPadOrHole(hole))
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

  for (const pcbTraceId of error.pcb_trace_ids ?? []) {
    relatedIds.add(pcbTraceId)
  }

  if (error.pcb_smtpad_id) {
    relatedIds.add(error.pcb_smtpad_id)
  }

  for (const pcbSmtpadId of error.pcb_smtpad_ids ?? []) {
    relatedIds.add(pcbSmtpadId)
  }

  if (error.pcb_plated_hole_id) {
    relatedIds.add(error.pcb_plated_hole_id)
  }

  for (const pcbPlatedHoleId of error.pcb_plated_hole_ids ?? []) {
    relatedIds.add(pcbPlatedHoleId)
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
