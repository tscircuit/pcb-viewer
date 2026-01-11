import { drawGrid } from "lib/draw-grid"
import { SuperGrid, toMMSI } from "react-supergrid"
import React, { useEffect, useRef } from "react"
import type { Matrix } from "transformation-matrix"
import { drawPrimitives } from "lib/draw-primitives"
import { Drawer } from "lib/Drawer"
import type { GridConfig, Primitive } from "lib/types"
import { useGlobalStore } from "../global-store"
import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import { drawSilkscreenElementsForLayer } from "lib/draw-silkscreen"
import { drawPlatedHolePads } from "lib/draw-plated-hole"
import { drawFabricationNoteElementsForLayer } from "lib/draw-fabrication-note"
import { drawPcbNoteElementsForLayer } from "lib/draw-pcb-note"
import { drawPcbHoleElementsForLayer } from "lib/draw-hole"
import { drawPcbBoardElements } from "lib/draw-pcb-board"
import { drawPcbCutoutElementsForLayer } from "lib/draw-pcb-cutout"
import { drawPcbSmtPadElementsForLayer } from "lib/draw-pcb-smtpad"
import { drawPcbKeepoutElementsForLayer } from "lib/draw-pcb-keepout"
import { drawPcbViaElementsForLayer } from "lib/draw-via"

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
  "edge_cuts",
  "bottom_notes",
  "top_notes",
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
    // Also filter out SMT pad primitives since they're drawn with circuit-to-canvas
    const filteredPrimitives = primitives
      .filter((p) => isShowingSolderMask || !p.layer?.includes("soldermask"))
      .filter((p) => p.layer !== "board")
      .filter((p) => p._element?.type !== "pcb_smtpad")
      .filter((p) => p._element?.type !== "pcb_plated_hole")
      .filter((p) => p._element?.type !== "pcb_via")

    drawPrimitives(drawer, filteredPrimitives)

    // Draw silkscreen elements using circuit-to-canvas
    if (transform) {
      // Draw plated holes using circuit-to-canvas (pads on copper layers, drills on drill layer)
      const topCanvas = canvasRefs.current.top
      if (topCanvas) {
        drawPlatedHolePads({
          canvas: topCanvas,
          elements,
          layers: ["top_copper"],
          realToCanvasMat: transform,
          primitives,
        })
      }

      const bottomCanvas = canvasRefs.current.bottom
      if (bottomCanvas) {
        drawPlatedHolePads({
          canvas: bottomCanvas,
          elements,
          layers: ["bottom_copper"],
          realToCanvasMat: transform,
          primitives,
        })
      }

      // Draw SMT pads using circuit-to-canvas (on copper layers)
      if (topCanvas) {
        drawPcbSmtPadElementsForLayer({
          canvas: topCanvas,
          elements,
          layers: ["top_copper"],
          realToCanvasMat: transform,
          primitives,
        })
      }

      if (bottomCanvas) {
        drawPcbSmtPadElementsForLayer({
          canvas: bottomCanvas,
          elements,
          layers: ["bottom_copper"],
          realToCanvasMat: transform,
          primitives,
        })
      }

      // Draw vias using circuit-to-canvas (on copper layers)
      if (topCanvas) {
        drawPcbViaElementsForLayer({
          canvas: topCanvas,
          elements,
          layers: ["top_copper"],
          realToCanvasMat: transform,
          primitives,
        })
      }

      if (bottomCanvas) {
        drawPcbViaElementsForLayer({
          canvas: bottomCanvas,
          elements,
          layers: ["bottom_copper"],
          realToCanvasMat: transform,
          primitives,
        })
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

      // Draw bottom notes
      const bottomNotesCanvas = canvasRefs.current.bottom_notes
      if (bottomNotesCanvas) {
        drawPcbNoteElementsForLayer(
          bottomNotesCanvas,
          elements,
          ["bottom_user_note"],
          transform,
        )
      }

      // Draw top notes
      const topNotesCanvas = canvasRefs.current.top_notes
      if (topNotesCanvas) {
        drawPcbNoteElementsForLayer(
          topNotesCanvas,
          elements,
          ["top_user_note"],
          transform,
        )
      }
      // Draw PCB holes
      const drillCanvas = canvasRefs.current.drill
      if (drillCanvas) {
        drawPcbHoleElementsForLayer(drillCanvas, elements, ["drill"], transform)
      }
      // Draw board outline using circuit-to-canvas
      const boardCanvas = canvasRefs.current.board
      if (boardCanvas) {
        drawPcbBoardElements(boardCanvas, elements, [], transform)
      }

      // Draw PCB cutouts using circuit-to-canvas
      const edgeCutsCanvas = canvasRefs.current.edge_cuts
      if (edgeCutsCanvas) {
        drawPcbCutoutElementsForLayer(
          edgeCutsCanvas,
          elements,
          ["edge_cuts"],
          transform,
        )
      }

      // Draw keepouts using circuit-to-canvas (on copper layers)
      if (topCanvas) {
        drawPcbKeepoutElementsForLayer({
          canvas: topCanvas,
          elements,
          layers: ["top"],
          realToCanvasMat: transform,
        })
      }

      if (bottomCanvas) {
        drawPcbKeepoutElementsForLayer({
          canvas: bottomCanvas,
          elements,
          layers: ["bottom"],
          realToCanvasMat: transform,
        })
      }

      const inner1Canvas = canvasRefs.current.inner1
      if (inner1Canvas) {
        drawPcbKeepoutElementsForLayer({
          canvas: inner1Canvas,
          elements,
          layers: ["inner1"],
          realToCanvasMat: transform,
        })
      }

      const inner2Canvas = canvasRefs.current.inner2
      if (inner2Canvas) {
        drawPcbKeepoutElementsForLayer({
          canvas: inner2Canvas,
          elements,
          layers: ["inner2"],
          realToCanvasMat: transform,
        })
      }

      const inner3Canvas = canvasRefs.current.inner3
      if (inner3Canvas) {
        drawPcbKeepoutElementsForLayer({
          canvas: inner3Canvas,
          elements,
          layers: ["inner3"],
          realToCanvasMat: transform,
        })
      }

      const inner4Canvas = canvasRefs.current.inner4
      if (inner4Canvas) {
        drawPcbKeepoutElementsForLayer({
          canvas: inner4Canvas,
          elements,
          layers: ["inner4"],
          realToCanvasMat: transform,
        })
      }

      const inner5Canvas = canvasRefs.current.inner5
      if (inner5Canvas) {
        drawPcbKeepoutElementsForLayer({
          canvas: inner5Canvas,
          elements,
          layers: ["inner5"],
          realToCanvasMat: transform,
        })
      }

      const inner6Canvas = canvasRefs.current.inner6
      if (inner6Canvas) {
        drawPcbKeepoutElementsForLayer({
          canvas: inner6Canvas,
          elements,
          layers: ["inner6"],
          realToCanvasMat: transform,
        })
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
