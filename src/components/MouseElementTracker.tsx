import React, { useState } from "react"
import { useMemo } from "react"
import { Matrix, applyToPoint, inverse } from "transformation-matrix"
import { Primitive } from "lib/types"
import { ElementOverlayBox } from "./ElementOverlayBox"
import { AnyElement } from "@tscircuit/builder"

export const MouseElementTracker = ({
  children,
  transform,
  primitives,
}: {
  children: any
  transform?: Matrix
  primitives: Primitive[]
}) => {
  const [mousedPrimitives, setMousedPrimitives] = useState<Primitive[]>([])

  const highlightedPrimitives = useMemo(() => {
    const highlightedPrimitives: HighlightedPrimitive[] = []
    for (const primitive of mousedPrimitives) {
      const screenPos = applyToPoint(
        transform,
        primitive as { x: number; y: number }
      )
      const w =
        "w" in primitive ? primitive.w : "r" in primitive ? primitive.r * 2 : 0
      const h =
        "h" in primitive ? primitive.h : "r" in primitive ? primitive.r * 2 : 0
      const screenSize = {
        w: w * transform.d,
        h: h * transform.d,
      }
      highlightedPrimitives.push({
        ...(primitive as any),
        screen_x: screenPos.x,
        screen_y: screenPos.y,
        screen_w: screenSize.w,
        screen_h: screenSize.h,
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
          const rwPoint = applyToPoint(inverse(transform), { x, y })

          const mousedPrimitives: Primitive[] = []
          for (const primitive of primitives) {
            if (
              !(
                "x" in primitive &&
                "y" in primitive &&
                (("w" in primitive && "h" in primitive) || "r" in primitive)
              )
            )
              continue
            if (!primitive._element) continue

            const w = "w" in primitive ? primitive.w : primitive.r * 2
            const h = "h" in primitive ? primitive.h : primitive.r * 2

            if (
              Math.abs(primitive.x - rwPoint.x) < w / 2 &&
              Math.abs(primitive.y - rwPoint.y) < h / 2
            ) {
              mousedPrimitives.push(primitive)
            }
          }
          setMousedPrimitives(mousedPrimitives)
        }
      }}
    >
      {children}
      <ElementOverlayBox highlightedPrimitives={highlightedPrimitives} />
    </div>
  )
}

export type HighlightedPrimitive = {
  x: number
  y: number
  w: number
  h: number
  _element: AnyElement
  _parent_pcb_component?: AnyElement
  _parent_source_component?: AnyElement
  screen_x: number
  screen_y: number
  screen_w: number
  screen_h: number
}
