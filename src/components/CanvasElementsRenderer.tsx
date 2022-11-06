import React from "react"
import { CanvasPrimitiveRenderer } from "./CanvasPrimitiveRenderer"
import { AnyElement } from "@tscircuit/builder"
import { useMemo } from "react"
import { convertElementToPrimitives } from "../lib/convert-element-to-primitive"
import { Matrix } from "transformation-matrix"
import { GridConfig } from "lib/types"

export interface CanvasElementsRendererProps {
  elements: AnyElement[]
  transform?: Matrix
  width?: number
  height?: number
  grid?: GridConfig
}

export const CanvasElementsRenderer = (props: CanvasElementsRendererProps) => {
  const primitives = useMemo(() => {
    const primitives = props.elements.flatMap((elm) =>
      convertElementToPrimitives(elm)
    )
    return primitives
  }, [props.elements])
  return (
    <CanvasPrimitiveRenderer
      transform={props.transform}
      primitives={primitives}
      width={props.width}
      height={props.height}
      grid={props.grid}
    />
  )
}
