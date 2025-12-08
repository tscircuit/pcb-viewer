import { pointToSegmentDistance } from "@tscircuit/math-utils"
import type { AnyCircuitElement } from "circuit-json"
import { distance } from "circuit-json"
import type { Primitive } from "lib/types"
import { ifSetsMatchExactly } from "lib/util/if-sets-match-exactly"
import { throttleAnimationFrame } from "lib/util/throttleAnimationFrame"
import React, { useState, useMemo } from "react"
import { useMeasure } from "react-use"
import type { Matrix } from "transformation-matrix"
import { applyToPoint, inverse } from "transformation-matrix"
import { ElementOverlayBox } from "./ElementOverlayBox"
import { GroupAnchorOffsetOverlay } from "./GroupAnchorOffsetOverlay"

const getPolygonBoundingBox = (
  points: ReadonlyArray<{ x: number; y: number }>,
) => {
  if (points.length === 0) return null

  let minX = points[0]!.x
  let minY = points[0]!.y
  let maxX = points[0]!.x
  let maxY = points[0]!.y

  for (const point of points) {
    if (point.x < minX) minX = point.x
    if (point.y < minY) minY = point.y
    if (point.x > maxX) maxX = point.x
    if (point.y > maxY) maxY = point.y
  }

  return {
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    },
    width: maxX - minX,
    height: maxY - minY,
  }
}

const isPointInsidePolygon = (
  point: { x: number; y: number },
  polygon: ReadonlyArray<{ x: number; y: number }>,
) => {
  if (polygon.length < 3) return false

  let isInside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x
    const yi = polygon[i]!.y
    const xj = polygon[j]!.x
    const yj = polygon[j]!.y

    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || Number.EPSILON) + xi

    if (intersects) {
      isInside = !isInside
    }
  }

  return isInside
}

const getPrimitivesUnderPoint = (
  primitives: Primitive[],
  rwPoint: { x: number; y: number },
  transform: Matrix,
): Primitive[] => {
  const newMousedPrimitives: Primitive[] = []

  for (const primitive of primitives) {
    if (!primitive._element) continue

    // Handle PCB traces
    if ("x1" in primitive && primitive._element?.type === "pcb_trace") {
      const distance = pointToSegmentDistance(
        { x: rwPoint.x, y: rwPoint.y },
        { x: primitive.x1, y: primitive.y1 },
        { x: primitive.x2, y: primitive.y2 },
      )

      const lineWidth = primitive.width || 0.5
      const detectionThreshold = Math.max(lineWidth * 25, 2) / transform!.a

      if (distance < detectionThreshold) {
        newMousedPrimitives.push(primitive)
      }
      continue
    }

    if (primitive.pcb_drawing_type === "polygon") {
      const points = primitive.points.map((point) => ({
        x: distance.parse(point.x),
        y: distance.parse(point.y),
      }))
      const boundingBox = getPolygonBoundingBox(points)
      if (!boundingBox) continue

      if (
        rwPoint.x < boundingBox.center.x - boundingBox.width / 2 ||
        rwPoint.x > boundingBox.center.x + boundingBox.width / 2 ||
        rwPoint.y < boundingBox.center.y - boundingBox.height / 2 ||
        rwPoint.y > boundingBox.center.y + boundingBox.height / 2
      ) {
        continue
      }

      if (isPointInsidePolygon(rwPoint, points)) {
        newMousedPrimitives.push(primitive)
      }
      continue
    }

    if (primitive.pcb_drawing_type === "polygon_with_arcs") {
      const points = primitive.brep_shape.outer_ring.vertices.map((v) => ({
        x: distance.parse(v.x),
        y: distance.parse(v.y),
      }))
      const boundingBox = getPolygonBoundingBox(points)
      if (!boundingBox) continue

      if (
        rwPoint.x < boundingBox.center.x - boundingBox.width / 2 ||
        rwPoint.x > boundingBox.center.x + boundingBox.width / 2 ||
        rwPoint.y < boundingBox.center.y - boundingBox.height / 2 ||
        rwPoint.y > boundingBox.center.y + boundingBox.height / 2
      ) {
        continue
      }

      if (isPointInsidePolygon(rwPoint, points)) {
        newMousedPrimitives.push(primitive)
      }
      continue
    }

    // Handle primitives with x, y coordinates
    if (!("x" in primitive && "y" in primitive)) continue

    let w = 0
    let h = 0

    if ("w" in primitive && "h" in primitive) {
      w = primitive.w
      h = primitive.h
    } else if ("r" in primitive) {
      w = (primitive as any).r * 2
      h = (primitive as any).r * 2
    } else if ("rX" in primitive && "rY" in primitive) {
      w = primitive.rX * 2
      h = primitive.rY * 2
    } else {
      continue
    }

    if (
      Math.abs((primitive as any).x - rwPoint.x) < w / 2 &&
      Math.abs((primitive as any).y - rwPoint.y) < h / 2
    ) {
      newMousedPrimitives.push(primitive)
    }
  }

  return newMousedPrimitives
}

export const MouseElementTracker = ({
  elements,
  children,
  transform,
  primitives,
  onMouseHoverOverPrimitives,
}: {
  elements: AnyCircuitElement[]
  children: React.ReactNode
  transform?: Matrix
  primitives: Primitive[]
  onMouseHoverOverPrimitives: (primitivesHoveredOver: Primitive[]) => void
}) => {
  const [mousedPrimitives, setMousedPrimitives] = useState<Primitive[]>([])
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [containerRef, { width, height }] = useMeasure<HTMLDivElement>()

  const highlightedPrimitives = useMemo(() => {
    const highlightedPrimitives: HighlightedPrimitive[] = []
    for (const primitive of mousedPrimitives) {
      if (primitive._element?.type === "pcb_via") continue
      if (primitive._element?.type === "pcb_component") continue
      if (primitive?.layer === "drill") continue
      let basePoint: { x: number; y: number } | null = null
      let w = 0
      let h = 0

      if (primitive.pcb_drawing_type === "polygon") {
        const boundingBox = getPolygonBoundingBox(primitive.points)
        if (!boundingBox) continue
        basePoint = boundingBox.center
        w = boundingBox.width
        h = boundingBox.height
      } else if (primitive.pcb_drawing_type === "polygon_with_arcs") {
        const points = primitive.brep_shape.outer_ring.vertices.map((v) => ({
          x: v.x,
          y: v.y,
        }))
        const boundingBox = getPolygonBoundingBox(points)
        if (!boundingBox) continue
        basePoint = boundingBox.center
        w = boundingBox.width
        h = boundingBox.height
      } else if ("x" in primitive && "y" in primitive) {
        basePoint = { x: primitive.x, y: primitive.y }
        w =
          "w" in primitive
            ? primitive.w
            : "r" in primitive
              ? primitive.r * 2
              : "rX" in primitive && "rY" in primitive
                ? primitive.rX * 2
                : 0
        h =
          "h" in primitive
            ? primitive.h
            : "r" in primitive
              ? primitive.r * 2
              : "rX" in primitive && "rY" in primitive
                ? primitive.rY * 2
                : 0
      }

      if (!basePoint) continue

      const screenPos = applyToPoint(transform!, basePoint)
      const screenSize = {
        w: w * transform!.a,
        h: h * transform!.a,
      }

      // FANCY: If 2+ highlighted primitives inhabit the same space, give
      // them an incrementing same_space_index
      const same_space_index = highlightedPrimitives.filter(
        (hp) =>
          screenPos.x === hp.screen_x &&
          screenPos.y === hp.screen_y &&
          screenSize.w === hp.screen_w &&
          screenSize.h === hp.screen_h,
      ).length

      highlightedPrimitives.push({
        ...(primitive as any),
        x: basePoint.x,
        y: basePoint.y,
        w,
        h,
        screen_x: screenPos.x,
        screen_y: screenPos.y,
        screen_w: screenSize.w,
        screen_h: screenSize.h,
        same_space_index,
      })
    }

    return highlightedPrimitives
  }, [mousedPrimitives, transform])

  const handleInteraction = (
    x: number,
    y: number,
    transform: Matrix,
    primitives: Primitive[],
  ) => {
    setMousePos({ x, y })
    const rwPoint = applyToPoint(inverse(transform), { x, y })
    const newMousedPrimitives = getPrimitivesUnderPoint(
      primitives,
      rwPoint,
      transform,
    )

    if (
      ifSetsMatchExactly(
        new Set(newMousedPrimitives.map((p) => p._pcb_drawing_object_id)),
        new Set(mousedPrimitives.map((p) => p._pcb_drawing_object_id)),
      )
    ) {
      return
    }

    setMousedPrimitives(newMousedPrimitives)
    onMouseHoverOverPrimitives(newMousedPrimitives)
  }

  const handleMouseMove = throttleAnimationFrame(
    (clientX: number, clientY: number, target: HTMLDivElement) => {
      if (!transform) return
      const rect = target.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      handleInteraction(x, y, transform, primitives)
    },
  )

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
      onMouseMove={(e) => {
        handleMouseMove(e.clientX, e.clientY, e.currentTarget)
      }}
      onTouchStart={(e) => {
        if (transform) {
          const touch = e.touches[0]
          const rect = e.currentTarget.getBoundingClientRect()
          const x = touch.clientX - rect.left
          const y = touch.clientY - rect.top
          handleInteraction(x, y, transform, primitives)
        }
      }}
    >
      {children}
      <ElementOverlayBox
        elements={elements}
        mousePos={mousePos}
        highlightedPrimitives={highlightedPrimitives}
      />
      {transform && (
        <GroupAnchorOffsetOverlay
          elements={elements}
          highlightedPrimitives={highlightedPrimitives}
          transform={transform}
          containerWidth={width}
          containerHeight={height}
        />
      )}
    </div>
  )
}

export type HighlightedPrimitive = {
  x: number
  y: number
  w: number
  h: number
  same_space_index?: number
  _element: AnyCircuitElement
  _parent_pcb_component?: AnyCircuitElement
  _parent_source_component?: AnyCircuitElement
  _source_port?: AnyCircuitElement
  screen_x: number
  screen_y: number
  screen_w: number
  screen_h: number
}
