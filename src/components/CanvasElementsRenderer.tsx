import React, { useCallback, useState } from "react"
import { CanvasPrimitiveRenderer } from "./CanvasPrimitiveRenderer"
import { AnyElement } from "@tscircuit/builder"
import { useMemo } from "react"
import { convertElementToPrimitives } from "../lib/convert-element-to-primitive"
import { Matrix, applyToPoint, inverse } from "transformation-matrix"
import { GridConfig, Primitive } from "lib/types"

export interface CanvasElementsRendererProps {
  elements: AnyElement[]
  transform?: Matrix
  width?: number
  height?: number
  grid?: GridConfig
}

export const getTextForElement = (element: AnyElement): string => {
  switch (element.type) {
    case "pcb_smtpad": {
      return element.port_hints.join(",")
    }
    case "pcb_plated_hole": {
      return element.port_hints.join(",")
    }
    default: {
      return ""
    }
  }
}

type HighlightedPrimitive = {
  x: number
  y: number
  w: number
  h: number
  _element: AnyElement
  screen_x: number
  screen_y: number
  screen_w: number
  screen_h: number
}

export const MouseElementTracker = ({
  children,
  transform,
  primitives,
}: {
  children: any
  transform?: Matrix
  primitives: Primitive[]
}) => {
  const [highlightedPrimitives, setHighlightedPrimitives] = useState<
    HighlightedPrimitive[]
  >([])
  return (
    <div
      style={{ position: "relative" }}
      onMouseMove={(e) => {
        if (transform) {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const rwPoint = applyToPoint(inverse(transform), { x, y })

          const highlightedPrimitives: HighlightedPrimitive[] = []
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
              const screenPos = applyToPoint(transform, primitive)
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
          }
          setHighlightedPrimitives(highlightedPrimitives)
        }
      }}
    >
      {children}
      <ElementMouseOverlay highlightedPrimitives={highlightedPrimitives} />
    </div>
  )
}

export const ElementMouseOverlay = ({
  highlightedPrimitives,
}: {
  highlightedPrimitives: HighlightedPrimitive[]
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        color: "red",
        fontFamily: "sans-serif",
        fontSize: 12,
        textShadow: "0 0 2px black",
      }}
    >
      {highlightedPrimitives.map((primitive, i) => (
        <div
          key={`${i}-box`}
          style={{
            position: "absolute",
            left: primitive.screen_x - primitive.screen_w / 2 - 8,
            top: primitive.screen_y - primitive.screen_h / 2 - 8,
            width: primitive.screen_w + 16,
            height: primitive.screen_h + 16,
            border: "1px solid red",
          }}
        />
      ))}
      {highlightedPrimitives.map((primitive, i) => (
        <div
          key={`${i}-text`}
          style={{
            position: "absolute",
            left: primitive.screen_x - primitive.screen_w / 2 - 8,
            top: primitive.screen_y - primitive.screen_h / 2 - 8,
          }}
        >
          <div style={{ position: "absolute", left: 0, bottom: 0 }}>
            {getTextForElement(primitive._element)}
          </div>
        </div>
      ))}
    </div>
  )
}

export const CanvasElementsRenderer = (props: CanvasElementsRendererProps) => {
  const primitives = useMemo(() => {
    const primitives = props.elements.flatMap((elm) =>
      convertElementToPrimitives(elm)
    )
    return primitives
  }, [props.elements])
  return (
    <MouseElementTracker transform={props.transform} primitives={primitives}>
      <CanvasPrimitiveRenderer
        transform={props.transform}
        primitives={primitives}
        width={props.width}
        height={props.height}
        grid={props.grid}
      />
    </MouseElementTracker>
  )
}
