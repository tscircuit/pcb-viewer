import type { AnyCircuitElement } from "circuit-json"
import { applyToPoint, inverse, type Matrix } from "transformation-matrix"
import { getCopperLayerRefsFromElements } from "./copper-layers"
import type { Primitive } from "./types"

export interface RenderBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const union = (a: RenderBounds, b: RenderBounds): RenderBounds => ({
  minX: Math.min(a.minX, b.minX),
  minY: Math.min(a.minY, b.minY),
  maxX: Math.max(a.maxX, b.maxX),
  maxY: Math.max(a.maxY, b.maxY),
})

const pointBounds = (
  points: { x: number; y: number }[],
  padding = 0,
): RenderBounds | null => {
  if (
    !Number.isFinite(padding) ||
    padding < 0 ||
    !points.length ||
    points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    return null
  return {
    minX: Math.min(...points.map((p) => p.x)) - padding,
    minY: Math.min(...points.map((p) => p.y)) - padding,
    maxX: Math.max(...points.map((p) => p.x)) + padding,
    maxY: Math.max(...points.map((p) => p.y)) + padding,
  }
}

/** Conservative bounds. Unsupported shapes stay in the draw list. */
export const getPrimitiveRenderBounds = (p: Primitive): RenderBounds | null => {
  if (p.pcb_drawing_type === "line") {
    if (p.zoomIndependent) return null
    return pointBounds(
      [
        { x: p.x1, y: p.y1 },
        { x: p.x2, y: p.y2 },
      ],
      p.width,
    )
  }
  if (p.pcb_drawing_type === "polygon") return pointBounds(p.points)
  if (p.pcb_drawing_type === "rect" || p.pcb_drawing_type === "pill") {
    if (p.pcb_drawing_type === "rect" && p.align && p.align !== "center")
      return null
    const r =
      Math.hypot(p.w, p.h) / 2 +
      ("stroke_width" in p ? (p.stroke_width ?? 0) : 0)
    return pointBounds([{ x: p.x, y: p.y }], r)
  }
  if (p.pcb_drawing_type === "circle")
    return pointBounds([{ x: p.x, y: p.y }], p.r)
  if (p.pcb_drawing_type === "oval")
    return pointBounds([{ x: p.x, y: p.y }], Math.max(p.rX, p.rY))
  // Text layout and bulged arcs require their renderer's exact geometry.
  return null
}

export const boundsOverlap = (a: RenderBounds, b: RenderBounds) =>
  a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY

const transformBounds = (b: RenderBounds, m: Matrix): RenderBounds =>
  pointBounds(
    [
      { x: b.minX, y: b.minY },
      { x: b.minX, y: b.maxY },
      { x: b.maxX, y: b.minY },
      { x: b.maxX, y: b.maxY },
    ].map((p) => applyToPoint(m, p)),
  )!

export const canPartiallyRenderInteractions = (m: Matrix): boolean =>
  Object.values(m).every(Number.isFinite) &&
  m.a > 0 &&
  m.b === 0 &&
  m.c === 0 &&
  m.d === -m.a

export const getInteractionClipBounds = (
  bounds: RenderBounds,
  transform: Matrix,
) => {
  if (
    !canPartiallyRenderInteractions(transform) ||
    !Object.values(bounds).every(Number.isFinite)
  )
    return null
  const screen = transformBounds(bounds, transform)
  // Round outward and include antialiasing beyond the geometric boundary.
  const pixels = {
    minX: Math.floor(screen.minX) - 4,
    minY: Math.floor(screen.minY) - 4,
    maxX: Math.ceil(screen.maxX) + 4,
    maxY: Math.ceil(screen.maxY) + 4,
  }
  return { pixels, world: transformBounds(pixels, inverse(transform)) }
}

export const getActivePrimitives = (primitives: Primitive[]) =>
  new Map(
    primitives
      .filter((p) => p.is_mouse_over || p.is_in_highlighted_net)
      .map((p) => [p._pcb_drawing_object_id, p]),
  )

export const createInteractionRenderIndex = (
  elements: AnyCircuitElement[],
  primitives: Primitive[],
) => {
  const elementBounds = new Map<AnyCircuitElement, RenderBounds | null>()
  for (const element of elements) {
    if (
      element.type === "pcb_trace" &&
      element.route_thickness_mode !== "interpolated"
    ) {
      const wires = element.route.filter((p) => p.route_type === "wire")
      elementBounds.set(
        element,
        pointBounds(wires, Math.max(0, ...wires.map((p) => p.width))),
      )
    } else if (element.type === "pcb_via") {
      elementBounds.set(
        element,
        pointBounds([element], element.outer_diameter / 2),
      )
    }
  }
  // SMT pad primitives include their transformed polygon/rotation. Other element
  // families may have additional geometry absent from their hit-test primitives.
  for (const p of primitives) {
    if (p._element?.type !== "pcb_smtpad") continue
    const b = getPrimitiveRenderBounds(p)
    if (!elementBounds.has(p._element)) elementBounds.set(p._element, b)
    else {
      const previous = elementBounds.get(p._element)
      elementBounds.set(p._element, previous && b ? union(previous, b) : null)
    }
  }
  return {
    elementBounds,
    copperLayers: getCopperLayerRefsFromElements(elements),
  }
}

export type InteractionRenderIndex = ReturnType<
  typeof createInteractionRenderIndex
>

/** undefined: unchanged; null: requires a full redraw. */
export const getChangedInteractionRegion = (
  previous: Map<string, Primitive>,
  current: Map<string, Primitive>,
  index: InteractionRenderIndex,
): { bounds: RenderBounds; layers: Set<string> } | null | undefined => {
  let bounds: RenderBounds | undefined
  const layers = new Set<string>()
  for (const [id, p] of new Map([...previous, ...current])) {
    if (previous.has(id) === current.has(id)) continue
    const element = p._element
    const b = element
      ? index.elementBounds.get(element)
      : getPrimitiveRenderBounds(p)
    if (!b) return null
    bounds = bounds ? union(bounds, b) : b
    layers.add(p.layer)
    if (element?.type === "pcb_trace") {
      for (const point of element.route)
        if (point.route_type === "wire") layers.add(point.layer)
    } else if (element?.type === "pcb_via") {
      // Hovering any of a via's primitives highlights it on all rendered layers.
      for (const layer of index.copperLayers) layers.add(layer)
    }
  }
  return bounds ? { bounds, layers } : undefined
}
