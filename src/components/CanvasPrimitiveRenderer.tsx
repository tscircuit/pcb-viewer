import { drawGrid } from "lib/draw-grid"
import { SuperGrid, toMMSI } from "react-supergrid"
import React, { useEffect, useRef } from "react"
import type { Matrix } from "transformation-matrix"
import { drawPrimitives } from "lib/draw-primitives"
import { Drawer } from "lib/Drawer"
import type { GridConfig, Primitive } from "lib/types"
import { useGlobalStore } from "../global-store"
import type { AnyCircuitElement } from "circuit-json"
import { drawSilkscreenElementsForLayer } from "lib/draw-silkscreen"
import { drawPlatedHolePads } from "lib/draw-plated-hole"
import { drawFabricationNoteElementsForLayer } from "lib/draw-fabrication-note"

interface Props {
  primitives: Primitive[]
  elements: AnyCircuitElement[]
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
  "soldermask_bottom",
  "top",
  "soldermask_top",
  "soldermask_with_copper_bottom",
  "soldermask_with_copper_top",
  "top_silkscreen",
  "top_fabrication",
  "bottom_fabrication",
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
  elements,
  transform,
  grid,
  width = 500,
  height = 500,
}: Props) => {
  const canvasRefs = useRef<Record<string, HTMLCanvasElement>>({})
  const selectedLayer = useGlobalStore((s) => s.selected_layer)
  const isShowingSolderMask = useGlobalStore((s) => s.is_showing_solder_mask)

  useEffect(() => {
    if (!canvasRefs.current) return
    if (Object.keys(canvasRefs.current).length === 0) return

    // Filter out null canvas refs and solder mask layers when disabled
    const filteredCanvasRefs = Object.fromEntries(
      Object.entries(canvasRefs.current).filter(([layer, canvas]) => {
        if (!canvas) return false
        if (!isShowingSolderMask && layer.includes("soldermask")) {
          return false
        }
        return true
      }),
    )

    if (Object.keys(filteredCanvasRefs).length === 0) return

    const drawer = new Drawer(filteredCanvasRefs)
    if (transform) drawer.transform = transform
    drawer.clear()
    drawer.foregroundLayer = selectedLayer

    // Filter out solder mask primitives when solder mask is disabled
    const filteredPrimitives = isShowingSolderMask
      ? primitives
      : primitives.filter((p) => !p.layer?.includes("soldermask"))

    drawPrimitives(drawer, filteredPrimitives)

    // Draw silkscreen elements using circuit-to-canvas
    if (transform) {
      // Draw plated holes using circuit-to-canvas (pads on copper layers, drills on drill layer)
      const topCanvas = canvasRefs.current.top
      if (topCanvas) {
        drawPlatedHolePads(topCanvas, elements, ["top_copper"], transform)
      }

      const bottomCanvas = canvasRefs.current.bottom
      if (bottomCanvas) {
        drawPlatedHolePads(bottomCanvas, elements, ["bottom_copper"], transform)
      }

      // Draw top silkscreen
      const topSilkscreenCanvas = canvasRefs.current.top_silkscreen
      if (topSilkscreenCanvas) {
        drawSilkscreenElementsForLayer(
          topSilkscreenCanvas,
          elements,
          ["top_silkscreen"],
          transform,
        )
      }

      // Draw bottom silkscreen
      const bottomSilkscreenCanvas = canvasRefs.current.bottom_silkscreen
      if (bottomSilkscreenCanvas) {
        drawSilkscreenElementsForLayer(
          bottomSilkscreenCanvas,
          elements,
          ["bottom_silkscreen"],
          transform,
        )
      }

      // Draw top fabrication
      const topFabCanvas = canvasRefs.current.top_fabrication
      if (topFabCanvas) {
        drawFabricationNoteElementsForLayer(
          topFabCanvas,
          elements,
          ["top_fabrication_note"],
          transform,
        )
      }

      // Draw bottom fabrication
      const bottomFabCanvas = canvasRefs.current.bottom_fabrication
      if (bottomFabCanvas) {
        drawFabricationNoteElementsForLayer(
          bottomFabCanvas,
          elements,
          ["bottom_fabrication_note"],
          transform,
        )
      }
    }

    drawer.orderAndFadeLayers()
  }, [primitives, elements, transform, selectedLayer, isShowingSolderMask])

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
        .filter((layer) => {
          if (!isShowingSolderMask) {
            // Filter out solder mask layers when disabled
            return !layer.includes("soldermask")
          }
          return true
        })
        .map((l) => l.replace(/-/g, ""))
        .map((layer, i) => (
          <canvas
            key={layer}
            className={`pcb-layer-${layer}`}
            ref={(el) => {
              canvasRefs.current ??= {}
              if (el) {
                canvasRefs.current[layer] = el
              } else {
                // Clean up ref when element is removed
                delete canvasRefs.current[layer]
              }
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
