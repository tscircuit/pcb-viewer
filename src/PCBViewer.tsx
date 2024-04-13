import React, { useEffect, useState } from "react"
import { createRoot } from "@tscircuit/react-fiber"
import {
  AnyElement,
  AnySoupElement,
  createProjectBuilder,
} from "@tscircuit/builder"
import { CanvasElementsRenderer } from "./components/CanvasElementsRenderer"
import useMouseMatrixTransform from "use-mouse-matrix-transform"
import { useMeasure } from "react-use"
import { compose, scale, translate } from "transformation-matrix"
import { findBoundsAndCenter } from "@tscircuit/builder"

const defaultTransform = compose(translate(400, 300), scale(40, 40))

type Props = {
  children?: any
  soup?: any
  height?: number
}

export const PCBViewer = ({ children, soup, height = 600 }: Props) => {
  const [stateElements, setStateElements] = useState<Array<AnyElement>>([])
  const [ref, refDimensions] = useMeasure()
  const [transform, setTransformInternal] = useState(defaultTransform)
  const { ref: transformRef, setTransform } = useMouseMatrixTransform({
    transform,
    onSetTransform: setTransformInternal,
  })

  const [error, setError] = useState(null)

  const resetTransform = () => {
    const elmBounds =
      refDimensions?.width > 0 ? refDimensions : { width: 500, height: 500 }
    const { center, width, height } = elements.some((e) =>
      e.type.startsWith("pcb_")
    )
      ? findBoundsAndCenter(elements.filter((e) => e.type.startsWith("pcb_")))
      : { center: { x: 0, y: 0 }, width: 0.001, height: 0.001 }
    const scaleFactor = Math.min(
      (elmBounds.width ?? 0) / width,
      (elmBounds.height ?? 0) / height,
      100
    )
    setTransform(
      compose(
        translate((elmBounds.width ?? 0) / 2, (elmBounds.height ?? 0) / 2),
        // translate(100, 0),
        scale(scaleFactor, scaleFactor, 0, 0),
        translate(-center.x, -center.y)
      )
    )
  }

  useEffect(() => {
    if (!children || children?.length === 0) return
    // TODO re-use project builder
    const projectBuilder = createProjectBuilder()
    createRoot()
      .render(children, projectBuilder as any)
      .then((elements) => {
        console.log({ elements })
        setStateElements(elements)
        setError(null)
      })
      .catch((e) => {
        setError(e.toString())
        console.log(e.toString())
      })
  }, [children])

  useEffect(() => {
    if (refDimensions && refDimensions.width !== 0 && children) {
      resetTransform()
    }
  }, [children, refDimensions])

  if (error) return <div style={{ color: "red" }}> {error} </div>

  const elements: AnySoupElement[] = soup ?? stateElements

  if (elements.length === 0) return null

  return (
    <div ref={transformRef as any}>
      <div ref={ref as any}>
        <CanvasElementsRenderer
          key={refDimensions.width}
          transform={transform}
          height={height}
          width={refDimensions.width}
          grid={{
            spacing: 1,
            view_window: {
              left: 0,
              right: refDimensions.width || 500,
              top: height,
              bottom: 0,
            },
          }}
          elements={elements.filter(
            (elm) =>
              elm.type.startsWith("pcb_") || elm.type.startsWith("source_")
          )}
        />
      </div>
    </div>
  )
}
