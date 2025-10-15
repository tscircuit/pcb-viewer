import { drawGrid } from "lib/draw-grid"
import { SuperGrid, toMMSI } from "react-supergrid"
import React, { useEffect, useRef } from "react"
import type { Matrix } from "transformation-matrix"
import { drawPrimitives } from "lib/draw-primitives"
import { Drawer } from "lib/Drawer"
import type { GridConfig, Primitive } from "lib/types"
import { useGlobalStore } from "../global-store"
import { all_layers } from "circuit-json"

interface Props {
  primitives: Primitive[]
  defaultUnit?: string
  transform?: Matrix
  grid?: GridConfig
  width?: number
  height?: number
}

const orderedLayers = [
  "board",
  "bottom_silkscreen",
  "bottom",
  "top",
  "top_silkscreen",
  "inner1",
  "inner2",
  "inner3",
  "inner4",
  "inner5",
  "inner6",
  "drill",
  "notes",
  "other",
]

export const CanvasPrimitiveRenderer = ({
  primitives,
  transform,
  grid,
  width = 500,
  height = 500,
}: Props) => {
  const canvasRefs = useRef<Record<string, HTMLCanvasElement>>({})
  const selectedLayer = useGlobalStore((s) => s.selected_layer)

  useEffect(() => {
    if (!canvasRefs.current) return
    if (Object.keys(canvasRefs.current).length === 0) return
    const drawer = new Drawer(canvasRefs.current)
    if (transform) drawer.transform = transform
    drawer.clear()
    drawer.foregroundLayer = selectedLayer
    drawPrimitives(drawer, primitives)
    drawer.orderAndFadeLayers()
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
        transform={transform!}
        stringifyCoord={(x, y, z) => `${toMMSI(x, z)}, ${toMMSI(y, z)}`}
      />
      {orderedLayers
        .map((l) => l.replace(/-/g, ""))
        .map((layer, i) => (
          <canvas
            key={layer}
            className={`pcb-layer-${layer}`}
            ref={(el) => {
              canvasRefs.current ??= {}
              canvasRefs.current[layer] = el!
            }}
            style={{
              position: "absolute",
              zIndex: i,
              left: 0,
              top: 0,
              pointerEvents: "none",
            }}
            width={width}
            height={height}
          />
        ))}
    </div>
  )
}
