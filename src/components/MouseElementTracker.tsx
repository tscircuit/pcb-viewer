import React, { useState } from "react"
import { useMemo } from "react"
import { Matrix, applyToPoint, inverse } from "transformation-matrix"
import { Primitive } from "lib/types"
import { ElementOverlayBox } from "./ElementOverlayBox"
import { AnyCircuitElement } from "circuit-json"
import { ifSetsMatchExactly } from "lib/util/if-sets-match-exactly"

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
      let same_space_index = highlightedPrimitives.filter(
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
  return (
    <div
      style={{ position: "relative" }}
      onMouseMove={(e) => {
        if (transform) {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          setMousePos({ x, y })
          const rwPoint = applyToPoint(inverse(transform), { x, y })

          const newMousedPrimitives: Primitive[] = []
          for (const primitive of primitives) {
            if ("x1" in primitive && primitive._element?.type === "pcb_trace") {
              // For traces, check if mouse point is near the line
              const dx = primitive.x2 - primitive.x1
              const dy = primitive.y2 - primitive.y1
              const len = Math.sqrt(dx * dx + dy * dy)

              if (len === 0) continue // Skip zero-length traces

              // Calculate distance from point to line segment using a simpler method
              const lineWidth = primitive.width || 0.5
              const detectionThreshold =
                Math.max(lineWidth * 20, 2) / transform!.a // Increased from 4 to 20

              // Check if point is within bounding box first (optimization)
              const minX =
                Math.min(primitive.x1, primitive.x2) - detectionThreshold
              const maxX =
                Math.max(primitive.x1, primitive.x2) + detectionThreshold
              const minY =
                Math.min(primitive.y1, primitive.y2) - detectionThreshold
              const maxY =
                Math.max(primitive.y1, primitive.y2) + detectionThreshold

              if (
                rwPoint.x >= minX &&
                rwPoint.x <= maxX &&
                rwPoint.y >= minY &&
                rwPoint.y <= maxY
              ) {
                // Calculate actual distance to line
                const numerator = Math.abs(
                  (primitive.x2 - primitive.x1) * (primitive.y1 - rwPoint.y) -
                    (primitive.x1 - rwPoint.x) * (primitive.y2 - primitive.y1),
                )
                const distance = numerator / len

                if (distance < detectionThreshold) {
                  newMousedPrimitives.push(primitive)
                }
              }
              continue
            }
            if (!primitive._element) continue

            // Check if primitive has x,y coordinates
            if (!("x" in primitive && "y" in primitive)) continue

            // Handle different primitive types
            let w = 0,
              h = 0

            if ("w" in primitive && "h" in primitive) {
              w = primitive.w
              h = primitive.h
            } else if ("r" in primitive) {
              w = (primitive as any).r * 2
              h = (primitive as any).r * 2
            } else {
              continue // Skip primitives without size
            }

            if (
              Math.abs((primitive as any).x - rwPoint.x) < w / 2 &&
              Math.abs((primitive as any).y - rwPoint.y) < h / 2
            ) {
              newMousedPrimitives.push(primitive)
            }
          }

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
