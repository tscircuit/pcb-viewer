import { drawGrid } from "lib/draw-grid"
import React, { useEffect, useRef } from "react"
import { Matrix } from "transformation-matrix"
import { drawPrimitives } from "../lib/draw-primitives"
import { Drawer } from "../lib/Drawer"
import { GridConfig, Primitive } from "../lib/types"

interface Props {
  primitives: Primitive[]
  defaultUnit?: string
  transform?: Matrix
  grid?: GridConfig
  width?: number
  height?: number
}

export const CanvasPrimitiveRenderer = ({
  primitives,
  transform,
  grid,
  width = 500,
  height = 500,
}: Props) => {
  const ref = useRef()
  useEffect(() => {
    const drawer = new Drawer(ref.current)
    if (transform) drawer.transform = transform
    drawer.clear()
    if (grid) drawGrid(drawer, grid)
    drawPrimitives(drawer, primitives)
  }, [primitives])

  return (
    <div
      style={{
        backgroundColor: "black",
        width,
        height,
        border: "1px solid #f00",
      }}
    >
      <canvas ref={ref} width={width} height={height}></canvas>
    </div>
  )
}
