import type { AnyCircuitElement } from "circuit-json"
import { getOrderedCanvasLayers } from "lib/copper-layers"
import type { GridConfig, Primitive } from "lib/types"
import { useEffect, useMemo, useRef } from "react"
import { SuperGrid, toMMSI } from "react-supergrid"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import { LayerRenderController } from "lib/rendering/layer-render-controller"
import type { PcbRenderOptions } from "lib/rendering/types"
interface Props {
  primitives: Primitive[]
  elements: AnyCircuitElement[]
  defaultUnit?: string
  transform?: Matrix
  grid?: GridConfig
  width?: number
  height?: number
  renderOptions?: PcbRenderOptions
}

export const CanvasPrimitiveRenderer = ({
  primitives,
  elements,
  transform,
  grid,
  width = 500,
  height = 500,
  renderOptions,
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

  const controllerRef = useRef<LayerRenderController | null>(null)
  const options = useMemo(
    () => ({
      selectedLayer,
      hiddenLayerOpacity,
      isShowingCopperPours,
      isShowingSolderMask,
      isShowingFabricationNotes,
      isShowingPcbNotes,
      isShowingCourtyards,
      isShowingSilkscreen,
    }),
    [
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
  const workerCount = renderOptions?.workerCount
  const settleDelayMs = renderOptions?.settleDelayMs
  const maxCacheBytes = renderOptions?.maxCacheBytes
  const workerFactory = renderOptions?.workerFactory

  useEffect(() => {
    const controller = new LayerRenderController(canvasRefs.current, {
      workerCount,
      settleDelayMs,
      maxCacheBytes,
      workerFactory,
    })
    controllerRef.current = controller
    return () => {
      controller.dispose()
      controllerRef.current = null
    }
  }, [workerCount, settleDelayMs, maxCacheBytes, workerFactory])

  useEffect(() => {
    controllerRef.current?.setScene({ elements, primitives, options })
  }, [
    elements,
    primitives,
    options,
    workerCount,
    settleDelayMs,
    maxCacheBytes,
    workerFactory,
  ])

  useEffect(() => {
    if (transform)
      controllerRef.current?.setView(
        transform,
        width,
        height,
        window.devicePixelRatio || 1,
      )
  }, [
    transform,
    width,
    height,
    workerCount,
    settleDelayMs,
    maxCacheBytes,
    workerFactory,
  ])

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
              width,
              height,
            }}
            width={width}
            height={height}
          />
        ))}
    </div>
  )
}
