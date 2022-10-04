import { CanvasPrimitiveRenderer } from "./CanvasPrimitiveRenderer"
import { AnyElement } from "@tscircuit/builder"
import { useMemo } from "react"
import { convertElementToPrimitives } from "../lib/convert-element-to-primitive"

export interface CanvasElementsRendererProps {
  elements: AnyElement[]
}

export const CanvasElementsRenderer = (props: CanvasElementsRendererProps) => {
  const primitives = useMemo(() => {
    return props.elements.flatMap((elm) => convertElementToPrimitives(elm))
  }, [props.elements])
  return <CanvasPrimitiveRenderer primitives={primitives} />
}
