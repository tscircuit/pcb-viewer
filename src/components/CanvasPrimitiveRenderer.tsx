import { drawGrid } from "lib/draw-grid"
import { SuperGrid, toMMSI } from "react-supergrid"
import React, { useEffect, useRef } from "react"
import { Matrix } from "transformation-matrix"
import { drawPrimitives } from "../lib/draw-primitives"
import { Drawer } from "../lib/Drawer"
import { GridConfig, Primitive } from "../lib/types"
import { useStore } from "global-store"

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
  const selectedLayer = useStore((s) => s.selected_layer)
  useEffect(() => {
    if (!ref.current) return
    const drawer = new Drawer(ref.current)
    if (transform) drawer.transform = transform
    drawer.clear()
    drawer.foregroundLayer = selectedLayer
    drawPrimitives(drawer, primitives)
  }, [primitives, transform, selectedLayer])

  return (
    <div
      style={{
        backgroundColor: "black",
        width,
        height,
        position: "relative",
      }}
    >
      <SuperGrid
        textColor="rgba(0,255,0,0.8)"
        majorColor="rgba(0,255,0,0.4)"
        minorColor="rgba(0,255,0,0.2)"
        screenSpaceCellSize={200}
        width={width}
        height={height}
        transform={transform}
        stringifyCoord={(x, y, z) => `${toMMSI(x, z)}, ${toMMSI(y, z)}`}
      />
      <canvas
        ref={ref}
        style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
        width={width}
        height={height}
      ></canvas>
    </div>
  )
}
