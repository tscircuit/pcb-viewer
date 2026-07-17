import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"
import { Drawer } from "lib/Drawer"
import { drawCopperPourElementsForLayer } from "lib/draw-copper-pour"
import { drawFabricationNoteElementsForLayer } from "lib/draw-fabrication-note"
import { drawGrid } from "lib/draw-grid"
import { drawPcbHoleElementsForLayer } from "lib/draw-hole"
import { drawPcbBoardElements } from "lib/draw-pcb-board"
import { drawPcbCopperTextElementsForLayer } from "lib/draw-pcb-copper-text"
import { drawPcbCutoutElementsForLayer } from "lib/draw-pcb-cutout"
import { drawPcbKeepoutElementsForLayer } from "lib/draw-pcb-keepout"
import { drawPcbNoteElementsForLayer } from "lib/draw-pcb-note"
import { drawPcbPanelElements } from "lib/draw-pcb-panel"
import { drawPcbSmtPadElementsForLayer } from "lib/draw-pcb-smtpad"
import { drawPcbTraceElementsForLayer } from "lib/draw-pcb-trace"
import { drawPlatedHolePads } from "lib/draw-plated-hole"
import { drawPrimitives } from "lib/draw-primitives"
import { drawSoldermaskElementsForLayer } from "lib/draw-soldermask"
import { drawSilkscreenElementsForLayer } from "lib/draw-silkscreen"
import { drawPcbViaElementsForLayer } from "lib/draw-via"
import { drawCourtyardElementsForLayer } from "lib/draw-courtyard"
import {
  getCopperLayerRefsFromElements,
  getCopperRenderLayer,
  getOrderedCanvasLayers,
} from "lib/copper-layers"
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
  const isShowingFabricationNotes = useGlobalStore(
    (s) => s.is_showing_fabrication_notes,
  )
  const isShowingCourtyards = useGlobalStore((s) => s.is_showing_courtyards)
  const isShowingSilkscreen = useGlobalStore((s) => s.is_showing_silkscreen)

  useEffect(() => {
    if (!canvasRefs.current) return
    if (Object.keys(canvasRefs.current).length === 0) return

    // Keep all non-null canvas refs so hidden layers are still cleared.
    const availableCanvasRefs = Object.fromEntries(
      Object.entries(canvasRefs.current).filter(([layer, canvas]) => {
        if (!canvas) return false
        return true
      }),
    )

    if (Object.keys(availableCanvasRefs).length === 0) return

    const drawer = new Drawer(availableCanvasRefs)
    if (transform) drawer.transform = transform
    drawer.clear()
    drawer.foregroundLayer = selectedLayer

    // Filter out solder mask and silkscreen primitives when disabled
    // Also filter out SMT pad primitives since they're drawn with circuit-to-canvas
    const filteredPrimitives = primitives
      .filter((p) => isShowingSolderMask || !p.layer?.includes("soldermask"))
      .filter((p) => isShowingSilkscreen || !p.layer?.includes("silkscreen"))
      .filter(
        (p) => isShowingFabricationNotes || !p.layer?.includes("fabrication"),
      )
      .filter((p) => p.layer !== "board")
      .filter((p) => p._element?.type !== "pcb_smtpad")
      .filter((p) => p._element?.type !== "pcb_plated_hole")
      .filter((p) => p._element?.type !== "pcb_via")
      .filter((p) => p._element?.type !== "pcb_trace")
      .filter((p) => p._element?.type !== "pcb_copper_text")

    drawPrimitives(drawer, filteredPrimitives)

    // Draw silkscreen elements using circuit-to-canvas
    if (transform) {
      // Draw plated holes using circuit-to-canvas (pads on copper layers, drills on drill layer)
      const topCanvas = canvasRefs.current.top
      const bottomCanvas = canvasRefs.current.bottom
      const copperLayers: Array<{
        canvas?: HTMLCanvasElement
        layer: string
        copperLayer: PcbRenderLayer
      }> = getCopperLayerRefsFromElements(elements).map((layer) => ({
        canvas: canvasRefs.current[layer],
        layer,
        copperLayer: getCopperRenderLayer(layer),
      }))

      // Draw PCB traces using circuit-to-canvas (on copper layers)
      for (const { canvas, copperLayer } of copperLayers) {
        if (!canvas) continue
        drawPcbTraceElementsForLayer({
          canvas,
          elements,
          layers: [copperLayer],
          realToCanvasMat: transform,
          primitives,
        })
      }

      for (const { canvas, copperLayer } of copperLayers) {
        if (!canvas) continue
        drawPcbCopperTextElementsForLayer({
          canvas,
          elements,
          layers: [copperLayer],
          realToCanvasMat: transform,
        })
      }

      for (const { canvas, copperLayer, layer } of copperLayers) {
        if (!canvas) continue
        drawPlatedHolePads({
          canvas,
          elements,
          layers: [copperLayer],
          realToCanvasMat: transform,
          primitives,
          drawSoldermask:
            isShowingSolderMask && (layer === "top" || layer === "bottom"),
        })
      }

      // Draw copper pours on every supported copper layer, including inners.
      for (const { canvas, copperLayer } of copperLayers) {
        if (!canvas) continue
        drawCopperPourElementsForLayer({
          canvas,
          elements,
          layers: [copperLayer],
          realToCanvasMat: transform,
        })
      }

      // Draw SMT pads using circuit-to-canvas (on copper layers)
      for (const { canvas, copperLayer } of copperLayers) {
        if (!canvas) continue
        drawPcbSmtPadElementsForLayer({
          canvas,
          elements,
          layers: [copperLayer],
          realToCanvasMat: transform,
          primitives,
          drawSoldermask: isShowingSolderMask,
        })
      }

      // Draw vias using circuit-to-canvas (on copper layers)
      for (const { canvas, copperLayer, layer } of copperLayers) {
        if (!canvas) continue
        drawPcbViaElementsForLayer({
          canvas,
          elements,
          layers: [copperLayer],
          realToCanvasMat: transform,
          primitives,
          drawSoldermask:
            isShowingSolderMask && (layer === "top" || layer === "bottom"),
        })
      }

      if (isShowingSolderMask) {
        const soldermaskLayer = selectedLayer === "bottom" ? "bottom" : "top"
        const drawSoldermaskTop = soldermaskLayer === "top"
        const drawSoldermaskBottom = soldermaskLayer === "bottom"

        const topSoldermaskCanvas = canvasRefs.current.soldermask_top
        if (topSoldermaskCanvas && soldermaskLayer === "top") {
          drawSoldermaskElementsForLayer({
            canvas: topSoldermaskCanvas,
            elements,
            layers: ["top_soldermask"],
            realToCanvasMat: transform,
            drawSoldermaskTop,
            drawSoldermaskBottom,
            primitives,
          })
        }

        const bottomSoldermaskCanvas = canvasRefs.current.soldermask_bottom
        if (bottomSoldermaskCanvas && soldermaskLayer === "bottom") {
          drawSoldermaskElementsForLayer({
            canvas: bottomSoldermaskCanvas,
            elements,
            layers: ["bottom_soldermask"],
            realToCanvasMat: transform,
            drawSoldermaskTop,
            drawSoldermaskBottom,
            primitives,
          })
        }
      }

      // Draw PCB holes
      const drillCanvas = canvasRefs.current.drill
      if (drillCanvas) {
        drawPcbHoleElementsForLayer({
          canvas: drillCanvas,
          elements,
          layers: ["drill"],
          realToCanvasMat: transform,
        })
      }

      // Draw silkscreen if enabled
      if (isShowingSilkscreen) {
        const topSilkscreenCanvas = canvasRefs.current.top_silkscreen
        if (topSilkscreenCanvas) {
          drawSilkscreenElementsForLayer({
            canvas: topSilkscreenCanvas,
            elements,
            layers: ["top_silkscreen"],
            realToCanvasMat: transform,
          })
        }

        const bottomSilkscreenCanvas = canvasRefs.current.bottom_silkscreen
        if (bottomSilkscreenCanvas) {
          drawSilkscreenElementsForLayer({
            canvas: bottomSilkscreenCanvas,
            elements,
            layers: ["bottom_silkscreen"],
            realToCanvasMat: transform,
          })
        }
      }

      // Draw top fabrication
      if (isShowingFabricationNotes) {
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

      // Draw top courtyard
      if (isShowingCourtyards) {
        const topCourtyardCanvas = canvasRefs.current.top_courtyard
        if (topCourtyardCanvas) {
          drawCourtyardElementsForLayer({
            canvas: topCourtyardCanvas,
            elements,
            layers: ["top_courtyard" as PcbRenderLayer],
            realToCanvasMat: transform,
          })
        }

        // Draw bottom courtyard
        const bottomCourtyardCanvas = canvasRefs.current.bottom_courtyard
        if (bottomCourtyardCanvas) {
          drawCourtyardElementsForLayer({
            canvas: bottomCourtyardCanvas,
            elements,
            layers: ["bottom_courtyard" as PcbRenderLayer],
            realToCanvasMat: transform,
          })
        }
      }

      // Draw board outline using circuit-to-canvas
      const boardCanvas = canvasRefs.current.board
      if (boardCanvas) {
        drawPcbPanelElements({
          canvas: boardCanvas,
          elements,
          layers: [],
          realToCanvasMat: transform,
          drawSoldermask: isShowingSolderMask,
        })
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
      const keepoutLayers = [
        { canvas: topCanvas, layer: "top" },
        { canvas: bottomCanvas, layer: "bottom" },
      ]

      for (const { canvas, layer } of keepoutLayers) {
        if (!canvas) continue
        drawPcbKeepoutElementsForLayer({
          canvas,
          elements,
          layers: [layer],
          realToCanvasMat: transform,
        })
      }
    }

    drawer.orderAndFadeLayers()
  }, [
    primitives,
    elements,
    transform,
    selectedLayer,
    isShowingSolderMask,
    isShowingFabricationNotes,
    isShowingCourtyards,
    isShowingSilkscreen,
  ])

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
      {getOrderedCanvasLayers(elements)
        .filter((layer) => {
          if (!isShowingSolderMask && layer.includes("soldermask")) return false
          if (!isShowingSilkscreen && layer.includes("silkscreen")) return false
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
