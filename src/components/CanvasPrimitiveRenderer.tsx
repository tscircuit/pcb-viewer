import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type { AnyCircuitElement, LayerRef, PcbRenderLayer } from "circuit-json"
import { Drawer } from "lib/Drawer"
import {
  getCopperLayerRefsFromElements,
  getCopperLayerDrawOrder,
  getCopperRenderLayer,
  getOrderedCanvasLayers,
} from "lib/copper-layers"
import { drawCopperPourElementsForLayer } from "lib/draw-copper-pour"
import { drawCourtyardElementsForLayer } from "lib/draw-courtyard"
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
import { drawSilkscreenElementsForLayer } from "lib/draw-silkscreen"
import { drawSoldermaskElementsForLayer } from "lib/draw-soldermask"
import { drawPcbViaElementsForLayer } from "lib/draw-via"
import { getPrimitivesForDrawer } from "lib/get-primitives-for-drawer"
import { zIndexMap } from "lib/util/z-index-map"
import type { GridConfig, Primitive } from "lib/types"
import React, { useEffect, useRef } from "react"
import { SuperGrid, toMMSI } from "react-supergrid"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../global-store"

interface Props {
  primitives: Primitive[]
  elements: AnyCircuitElement[]
  xRayElements?: AnyCircuitElement[]
  defaultUnit?: string
  transform?: Matrix
  grid?: GridConfig
  width?: number
  height?: number
}

export const CanvasPrimitiveRenderer = ({
  primitives,
  elements,
  xRayElements,
  transform,
  grid,
  width = 500,
  height = 500,
}: Props) => {
  const xRayCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRefs = useRef<Record<string, HTMLCanvasElement>>({})
  const hiddenLayerOpacity = useGlobalStore((s) => s.hidden_layer_opacity)
  const selectedLayer = useGlobalStore((s) => s.selected_layer)
  const isShowingCopperPours = useGlobalStore((s) => s.is_showing_copper_pours)
  const isShowingSolderMask = useGlobalStore((s) => s.is_showing_solder_mask)
  const isShowingFabricationNotes = useGlobalStore(
    (s) => s.is_showing_fabrication_notes,
  )
  const isShowingPcbNotes = useGlobalStore((s) => s.is_showing_pcb_notes)
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
    drawer.hiddenLayerOpacity = hiddenLayerOpacity
    drawer.xRayNetActive = Boolean(xRayElements)
    // Clear every canvas above, then omit drawing completely hidden layers.
    const visibleCanvasRefs = Object.fromEntries(
      Object.entries(availableCanvasRefs).filter(
        ([layer]) => drawer.getLayerOpacity(layer) > 0,
      ),
    )

    // Filter out solder mask and silkscreen primitives when disabled
    // Also filter out SMT pad primitives since they're drawn with circuit-to-canvas
    const filteredPrimitives = getPrimitivesForDrawer({
      primitives,
      isShowingSolderMask,
      isShowingSilkscreen,
      isShowingFabricationNotes,
    })

    drawPrimitives(
      drawer,
      filteredPrimitives.filter(
        (p) => drawer.getLayerOpacity(p.layer ?? "other") > 0,
      ),
    )

    // Draw silkscreen elements using circuit-to-canvas
    if (transform) {
      // Draw plated holes using circuit-to-canvas (pads on copper layers, drills on drill layer)
      const copperLayers: Array<{
        canvas?: HTMLCanvasElement
        layer: LayerRef
        copperLayer: PcbRenderLayer
      }> = getCopperLayerRefsFromElements(elements).map((layer) => ({
        canvas: visibleCanvasRefs[layer],
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
          showCopperPours: isShowingCopperPours,
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

        const topSoldermaskCanvas = visibleCanvasRefs.soldermask_top
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

        const bottomSoldermaskCanvas = visibleCanvasRefs.soldermask_bottom
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
      const drillCanvas = visibleCanvasRefs.drill
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
        const topSilkscreenCanvas = visibleCanvasRefs.top_silkscreen
        if (topSilkscreenCanvas) {
          drawSilkscreenElementsForLayer({
            canvas: topSilkscreenCanvas,
            elements,
            layers: ["top_silkscreen"],
            realToCanvasMat: transform,
          })
        }

        const bottomSilkscreenCanvas = visibleCanvasRefs.bottom_silkscreen
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
        const topFabCanvas = visibleCanvasRefs.top_fabrication
        if (topFabCanvas) {
          drawFabricationNoteElementsForLayer({
            canvas: topFabCanvas,
            elements,
            layers: ["top_fabrication_note"],
            realToCanvasMat: transform,
          })
        }

        // Draw bottom fabrication
        const bottomFabCanvas = visibleCanvasRefs.bottom_fabrication
        if (bottomFabCanvas) {
          drawFabricationNoteElementsForLayer({
            canvas: bottomFabCanvas,
            elements,
            layers: ["bottom_fabrication_note"],
            realToCanvasMat: transform,
          })
        }
      }

      if (isShowingPcbNotes) {
        // Draw bottom notes
        const bottomNotesCanvas = visibleCanvasRefs.bottom_notes
        if (bottomNotesCanvas) {
          drawPcbNoteElementsForLayer({
            canvas: bottomNotesCanvas,
            elements,
            layers: ["bottom_user_note"],
            realToCanvasMat: transform,
          })
        }

        // Draw top notes
        const topNotesCanvas = visibleCanvasRefs.top_notes
        if (topNotesCanvas) {
          drawPcbNoteElementsForLayer({
            canvas: topNotesCanvas,
            elements,
            layers: ["top_user_note"],
            realToCanvasMat: transform,
          })
        }
      }

      // Draw top courtyard
      if (isShowingCourtyards) {
        const topCourtyardCanvas = visibleCanvasRefs.top_courtyard
        if (topCourtyardCanvas) {
          drawCourtyardElementsForLayer({
            canvas: topCourtyardCanvas,
            elements,
            layers: ["top_courtyard" as PcbRenderLayer],
            realToCanvasMat: transform,
          })
        }

        // Draw bottom courtyard
        const bottomCourtyardCanvas = visibleCanvasRefs.bottom_courtyard
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
      const boardCanvas = visibleCanvasRefs.board
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
      const edgeCutsCanvas = visibleCanvasRefs.edge_cuts
      if (edgeCutsCanvas) {
        drawPcbCutoutElementsForLayer({
          canvas: edgeCutsCanvas,
          elements,
          layers: ["edge_cuts"],
          realToCanvasMat: transform,
        })
      }

      // Draw keepouts using circuit-to-canvas (on copper layers)
      for (const { canvas, layer } of copperLayers) {
        if (!canvas) continue
        drawPcbKeepoutElementsForLayer({
          canvas,
          elements,
          layer,
          realToCanvasMat: transform,
        })
      }
    }

    drawer.orderAndFadeLayers()
    const canvas = xRayCanvasRef.current
    if (canvas && transform && xRayElements) {
      canvas.getContext("2d")!.clearRect(0, 0, width, height)
      // Composite selected copper above every ordinary layer at full opacity.
      for (const layer of getCopperLayerDrawOrder(elements, selectedLayer)) {
        const args = {
          canvas,
          elements: xRayElements,
          layers: [getCopperRenderLayer(layer)],
          realToCanvasMat: transform,
          drawSoldermask: false,
        }
        drawPcbTraceElementsForLayer({ ...args, showCopperPours: false })
        drawPcbSmtPadElementsForLayer(args)
        drawPlatedHolePads(args)
        drawPcbViaElementsForLayer(args)
      }
      const drillDrawer = new CircuitToCanvasDrawer(canvas)
      drillDrawer.realToCanvasMat = transform
      drillDrawer.drawElements(
        xRayElements.filter(
          (el) => el.type === "pcb_via" || el.type === "pcb_plated_hole",
        ),
        { layers: ["drill"], drawSoldermask: false },
      )
    }
  }, [
    primitives,
    elements,
    xRayElements,
    width,
    height,
    transform,
    selectedLayer,
    hiddenLayerOpacity,
    isShowingCopperPours,
    isShowingSolderMask,
    isShowingFabricationNotes,
    isShowingPcbNotes,
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
      {xRayElements && (
        <canvas
          ref={xRayCanvasRef}
          className="pcb-x-ray-net"
          width={width}
          height={height}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: zIndexMap.topLayer,
            pointerEvents: "none",
          }}
        />
      )}
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
