import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import { Drawer } from "lib/Drawer"
import { drawCopperPourElementsForLayer } from "lib/draw-copper-pour"
import { drawFabricationNoteElementsForLayer } from "lib/draw-fabrication-note"
import { drawGrid } from "lib/draw-grid"
import { drawPcbHoleElementsForLayer } from "lib/draw-hole"
import { drawPcbBoardElements } from "lib/draw-pcb-board"
import { drawPcbCutoutElementsForLayer } from "lib/draw-pcb-cutout"
import { drawPcbKeepoutElementsForLayer } from "lib/draw-pcb-keepout"
import { drawPcbNoteElementsForLayer } from "lib/draw-pcb-note"
import { drawPcbSmtPadElementsForLayer } from "lib/draw-pcb-smtpad"
import { drawPlatedHolePads } from "lib/draw-plated-hole"
import { drawPrimitives } from "lib/draw-primitives"
import { drawSilkscreenElementsForLayer } from "lib/draw-silkscreen"
import { drawPcbViaElementsForLayer } from "lib/draw-via"
import type { GridConfig, Primitive } from "lib/types"
import React, { useEffect, useRef } from "react"
import { SuperGrid, toMMSI } from "react-supergrid"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../global-store"

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
      const bottomCanvas = canvasRefs.current.bottom
      const inner1Canvas = canvasRefs.current.inner1
      const inner2Canvas = canvasRefs.current.inner2
      const inner3Canvas = canvasRefs.current.inner3
      const inner4Canvas = canvasRefs.current.inner4
      const inner5Canvas = canvasRefs.current.inner5
      const inner6Canvas = canvasRefs.current.inner6
      if (topCanvas) {
        drawPlatedHolePads({
          canvas: topCanvas,
          elements,
          layers: ["top_copper"],
          realToCanvasMat: transform,
          primitives,
          drawSoldermask: isShowingSolderMask,
        })
      }

      if (bottomCanvas) {
        drawPlatedHolePads({
          canvas: bottomCanvas,
          elements,
          layers: ["bottom_copper"],
          realToCanvasMat: transform,
          primitives,
          drawSoldermask: isShowingSolderMask,
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
          drawSoldermask: isShowingSolderMask,
        })
      }

      if (bottomCanvas) {
        drawPcbSmtPadElementsForLayer({
          canvas: bottomCanvas,
          elements,
          layers: ["bottom_copper"],
          realToCanvasMat: transform,
          primitives,
          drawSoldermask: isShowingSolderMask,
        })
      }

      if (inner1Canvas) {
        console.log("Drawing inner1 SMT pads")
        drawPcbSmtPadElementsForLayer({
          canvas: inner1Canvas,
          elements,
          layers: ["inner1_copper"],
          realToCanvasMat: transform,
          primitives,
          drawSoldermask: isShowingSolderMask,
        })
      }

      if (inner2Canvas) {
        drawPcbSmtPadElementsForLayer({
          canvas: inner2Canvas,
          elements,
          layers: ["inner2_copper"],
          realToCanvasMat: transform,
          primitives,
          drawSoldermask: isShowingSolderMask,
        })
      }

      if (inner3Canvas) {
        drawPcbSmtPadElementsForLayer({
          canvas: inner3Canvas,
          elements,
          layers: ["inner3_copper"],
          realToCanvasMat: transform,
          primitives,
          drawSoldermask: isShowingSolderMask,
        })
      }

      if (inner4Canvas) {
        drawPcbSmtPadElementsForLayer({
          canvas: inner4Canvas,
          elements,
          layers: ["inner4_copper"],
          realToCanvasMat: transform,
          primitives,
          drawSoldermask: isShowingSolderMask,
        })
      }

      if (inner5Canvas) {
        drawPcbSmtPadElementsForLayer({
          canvas: inner5Canvas,
          elements,
          layers: ["inner5_copper"],
          realToCanvasMat: transform,
          primitives,
          drawSoldermask: isShowingSolderMask,
        })
      }

      if (inner6Canvas) {
        drawPcbSmtPadElementsForLayer({
          canvas: inner6Canvas,
          elements,
          layers: ["inner6_copper"],
          realToCanvasMat: transform,
          primitives,
          drawSoldermask: isShowingSolderMask,
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

      // Draw copper pour elements using circuit-to-canvas (on copper layers)
      if (topCanvas) {
        drawCopperPourElementsForLayer({
          canvas: topCanvas,
          elements,
          layers: ["top_copper"],
          realToCanvasMat: transform,
        })
      }

      if (bottomCanvas) {
        drawCopperPourElementsForLayer({
          canvas: bottomCanvas,
          elements,
          layers: ["bottom_copper"],
          realToCanvasMat: transform,
        })
      }

      // Draw top silkscreen
      const topSilkscreenCanvas = canvasRefs.current.top_silkscreen
      if (topSilkscreenCanvas) {
        drawSilkscreenElementsForLayer({
          canvas: topSilkscreenCanvas,
          elements,
          layers: ["top_silkscreen"],
          realToCanvasMat: transform,
        })
      }

      // Draw bottom silkscreen
      const bottomSilkscreenCanvas = canvasRefs.current.bottom_silkscreen
      if (bottomSilkscreenCanvas) {
        drawSilkscreenElementsForLayer({
          canvas: bottomSilkscreenCanvas,
          elements,
          layers: ["bottom_silkscreen"],
          realToCanvasMat: transform,
        })
      }

      // Draw top fabrication
      const topFabCanvas = canvasRefs.current.top_fabrication
      if (topFabCanvas) {
        drawFabricationNoteElementsForLayer({
          canvas: topFabCanvas,
          elements,
          layers: ["top_fabrication_note"],
          realToCanvasMat: transform,
        })
      }

      // Draw bottom fabrication
      const bottomFabCanvas = canvasRefs.current.bottom_fabrication
      if (bottomFabCanvas) {
        drawFabricationNoteElementsForLayer({
          canvas: bottomFabCanvas,
          elements,
          layers: ["bottom_fabrication_note"],
          realToCanvasMat: transform,
        })
      }

      // Draw bottom notes
      const bottomNotesCanvas = canvasRefs.current.bottom_notes
      if (bottomNotesCanvas) {
        drawPcbNoteElementsForLayer({
          canvas: bottomNotesCanvas,
          elements,
          layers: ["bottom_user_note"],
          realToCanvasMat: transform,
        })
      }

      // Draw top notes
      const topNotesCanvas = canvasRefs.current.top_notes
      if (topNotesCanvas) {
        drawPcbNoteElementsForLayer({
          canvas: topNotesCanvas,
          elements,
          layers: ["top_user_note"],
          realToCanvasMat: transform,
        })
      }
      // Draw PCB holes
      const drillCanvas = canvasRefs.current.drill
      if (drillCanvas) {
        drawPcbHoleElementsForLayer({
          canvas: drillCanvas,
          elements,
          layers: ["drill"],
          realToCanvasMat: transform,
          drawSoldermask: isShowingSolderMask,
        })
      }
      // Draw board outline using circuit-to-canvas
      const boardCanvas = canvasRefs.current.board
      if (boardCanvas) {
        drawPcbBoardElements({
          canvas: boardCanvas,
          elements,
          layers: [],
          realToCanvasMat: transform,
          drawSoldermask: isShowingSolderMask,
        })
      }

      // Draw PCB cutouts using circuit-to-canvas
      const edgeCutsCanvas = canvasRefs.current.edge_cuts
      if (edgeCutsCanvas) {
        drawPcbCutoutElementsForLayer({
          canvas: edgeCutsCanvas,
          elements,
          layers: ["edge_cuts"],
          realToCanvasMat: transform,
        })
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
