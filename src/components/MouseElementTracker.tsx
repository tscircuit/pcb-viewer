import React, { useState, useMemo } from "react"
import type { Matrix } from "transformation-matrix"
import { applyToPoint, inverse } from "transformation-matrix"
import type { Primitive } from "lib/types"
import { ElementOverlayBox } from "./ElementOverlayBox"
import type { AnyCircuitElement } from "circuit-json"
import { ifSetsMatchExactly } from "lib/util/if-sets-match-exactly"
import { pointToSegmentDistance } from "@tscircuit/math-utils"

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
  children: any
  transform?: Matrix
  primitives: Primitive[]
  onMouseHoverOverPrimitives: (primitivesHoveredOver: Primitive[]) => void
}) => {
  const [mousedPrimitives, setMousedPrimitives] = useState<Primitive[]>([])
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const highlightedPrimitives = useMemo(() => {
    const highlightedPrimitives: HighlightedPrimitive[] = []
    for (const primitive of mousedPrimitives) {
      if (primitive._element?.type === "pcb_via") continue
      if (primitive._element?.type === "pcb_component") continue
      if (primitive?.layer === "drill") continue
      const screenPos = applyToPoint(
        transform!,
        primitive as { x: number; y: number },
      )
      const w =
        "w" in primitive ? primitive.w : "r" in primitive ? primitive.r * 2 : 0
      const h =
        "h" in primitive ? primitive.h : "r" in primitive ? primitive.r * 2 : 0
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

  return (
    <div
      style={{ position: "relative" }}
      onMouseMove={(e) => {
        if (transform) {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          handleInteraction(x, y, transform, primitives)
        }
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
