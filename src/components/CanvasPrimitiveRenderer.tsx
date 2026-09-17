import {
  boundsOverlap,
  canPartiallyRenderInteractions,
  createInteractionRenderIndex,
  getActivePrimitives,
  getChangedInteractionRegion,
  getInteractionClipBounds,
  getPrimitiveRenderBounds,
} from "lib/interaction-render-regions"
import type { AnyCircuitElement, LayerRef, PcbRenderLayer } from "circuit-json"
import { Drawer } from "lib/Drawer"
import {
  getCopperLayerRefsFromElements,
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
import type { GridConfig, Primitive } from "lib/types"
import React, { useLayoutEffect, useMemo, useRef } from "react"
import {
  PAN_RENDER_MARGIN,
  getCachedPanOffset,
  getBufferedRenderTransform,
  type PanRenderSnapshot,
} from "lib/pan-render-cache"
import { SuperGrid, toMMSI } from "react-supergrid"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../global-store"

interface Props {
  primitives: Primitive[]
  basePrimitives?: Primitive[]
  elements: AnyCircuitElement[]
  defaultUnit?: string
  transform?: Matrix
  grid?: GridConfig
  width?: number
  height?: number
}

export const CanvasPrimitiveRenderer = ({
  primitives,
  basePrimitives = primitives,
  elements: allElements,
  transform: viewportTransform,
  grid,
  width = 500,
  height = 500,
}: Props) => {
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

  const renderScene = useMemo(
    () => ({}),
    [
      basePrimitives,
      allElements,
      width,
      height,
      selectedLayer,
      hiddenLayerOpacity,
      isShowingCopperPours,
      isShowingSolderMask,
      isShowingFabricationNotes,
      isShowingPcbNotes,
      isShowingCourtyards,
      isShowingSilkscreen,
    ],
  )
  const renderSnapshot = useRef<PanRenderSnapshot | null>(null)
  const renderedHighlights = useRef(new Map<string, Primitive>())
  const interactionIndex = useMemo(
    () => createInteractionRenderIndex(allElements, basePrimitives),
    [allElements, basePrimitives],
  )

  useLayoutEffect(() => {
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

    const offset = getCachedPanOffset(
      renderSnapshot.current,
      viewportTransform,
      renderScene,
    )
    for (const canvas of Object.values(availableCanvasRefs)) {
      canvas.style.transform = `translate(${offset?.x ?? 0}px, ${offset?.y ?? 0}px)`
    }
    const highlights = getActivePrimitives(primitives)
    const changedRegion = offset
      ? getChangedInteractionRegion(
          renderedHighlights.current,
          highlights,
          interactionIndex,
        )
      : null
    if (offset && changedRegion === undefined) return
    // Soldermask and unsupported geometry retain the complete rendering path.
    const partial =
      offset &&
      changedRegion &&
      !isShowingSolderMask &&
      viewportTransform &&
      canPartiallyRenderInteractions(viewportTransform)
        ? changedRegion
        : null
    const renderTransform = partial
      ? renderSnapshot.current!.transform
      : viewportTransform
    if (!partial)
      for (const canvas of Object.values(availableCanvasRefs))
        canvas.style.transform = "translate(0px, 0px)"

    const transform = renderTransform
      ? getBufferedRenderTransform(renderTransform)
      : undefined

    const clip =
      partial && transform
        ? getInteractionClipBounds(partial.bounds, transform)
        : null
    const elements = clip
      ? allElements.filter((element) => {
          const bounds = interactionIndex.elementBounds.get(element)
          return !bounds || boundsOverlap(bounds, clip.world)
        })
      : allElements
    const renderCanvasRefs = partial
      ? Object.fromEntries(
          Object.entries(availableCanvasRefs).filter(([layer]) =>
            partial.layers.has(layer),
          ),
        )
      : availableCanvasRefs
    const drawer = new Drawer(renderCanvasRefs)
    drawer.transform = transform ?? getBufferedRenderTransform(drawer.transform)
    if (clip)
      for (const ctx of Object.values(drawer.ctxLayerMap)) {
        const b = clip.pixels
        ctx.save()
        ctx.beginPath()
        ctx.rect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY)
        ctx.clip()
      }
    drawer.clear()
    drawer.foregroundLayer = selectedLayer
    drawer.hiddenLayerOpacity = hiddenLayerOpacity
    // Clear every canvas above, then omit drawing completely hidden layers.
    const visibleCanvasRefs = Object.fromEntries(
      Object.entries(renderCanvasRefs).filter(
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
      filteredPrimitives.filter((p) => {
        if (
          !(p.layer in renderCanvasRefs) ||
          drawer.getLayerOpacity(p.layer) === 0
        )
          return false
        const bounds = getPrimitiveRenderBounds(p)
        return !clip || !bounds || boundsOverlap(bounds, clip.world)
      }),
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

    if (clip) for (const ctx of Object.values(drawer.ctxLayerMap)) ctx.restore()
    renderedHighlights.current = highlights
    if (!partial) drawer.orderAndFadeLayers()
    if (!partial)
      renderSnapshot.current = viewportTransform
        ? { transform: { ...viewportTransform }, scene: renderScene }
        : null
  }, [viewportTransform, renderScene, primitives, interactionIndex])

  return (
    <div
      style={{
        backgroundColor: "black",
        width,
        height,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <SuperGrid
        textColor="rgba(0,255,0,0.8)"
        majorColor="rgba(0,255,0,0.4)"
        minorColor="rgba(0,255,0,0.2)"
        screenSpaceCellSize={200}
        width={width}
        height={height}
        transform={viewportTransform!}
        stringifyCoord={(x, y, z) => `${toMMSI(x, z)}, ${toMMSI(y, z)}`}
      />
      {getOrderedCanvasLayers(allElements)
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
              left: -PAN_RENDER_MARGIN,
              top: -PAN_RENDER_MARGIN,
              pointerEvents: "none",
            }}
            width={width + PAN_RENDER_MARGIN * 2}
            height={height + PAN_RENDER_MARGIN * 2}
          />
        ))}
    </div>
  )
}
