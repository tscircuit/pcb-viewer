import type { AnyCircuitElement } from "circuit-json"
import type { RenderOptions } from "circuit-json-webgpu"
import type { GridConfig, Primitive } from "lib/types"
import { createWebGpuWorker } from "lib/webgpu/create-worker"
import type { WebGpuRequest, WebGpuResponse } from "lib/webgpu/protocol"
import { useEffect, useMemo, useRef, useState } from "react"
import { SuperGrid, toMMSI } from "react-supergrid"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../global-store"
import { CanvasPrimitiveRenderer } from "./CanvasPrimitiveRenderer"

type Props = {
  elements: AnyCircuitElement[]
  primitives: Primitive[]
  transform?: Matrix
  width?: number
  height?: number
  grid?: GridConfig
}

/** Retains a GPU canvas in a worker; the UI thread sends scene/camera changes only. */
export function WebGpuElementsRenderer(props: Props) {
  const { elements, primitives, transform, width = 500, height = 500 } = props
  const holder = useRef<HTMLDivElement>(null)
  const workerRef = useRef<Worker | undefined>(undefined)
  const ready = useRef(false)
  const [failure, setFailure] = useState<string>()
  const selectedLayer = useGlobalStore((s) => s.selected_layer)
  const hiddenLayerOpacity = useGlobalStore((s) => s.hidden_layer_opacity)
  const showCopperPours = useGlobalStore((s) => s.is_showing_copper_pours)
  const showSolderMask = useGlobalStore((s) => s.is_showing_solder_mask)
  const showSilkscreen = useGlobalStore((s) => s.is_showing_silkscreen)
  const showFabricationNotes = useGlobalStore(
    (s) => s.is_showing_fabrication_notes,
  )
  const showPcbNotes = useGlobalStore((s) => s.is_showing_pcb_notes)
  const showCourtyards = useGlobalStore((s) => s.is_showing_courtyards)
  const highlightedElementIds = useMemo(
    () => [
      ...new Set(
        primitives.flatMap((p) => {
          if (!p.is_mouse_over && !p.is_in_highlighted_net) return []
          const element = p._element as Record<string, any> | undefined
          const id = element?.[`${element.type}_id`]
          return id ? [id as string] : []
        }),
      ),
    ],
    [primitives],
  )
  const options = useMemo<RenderOptions>(
    () => ({
      selectedLayer,
      hiddenLayerOpacity,
      showCopperPours,
      showSolderMask,
      showSilkscreen,
      showFabricationNotes,
      showPcbNotes,
      showCourtyards,
      highlightedElementIds,
    }),
    [
      selectedLayer,
      hiddenLayerOpacity,
      showCopperPours,
      showSolderMask,
      showSilkscreen,
      showFabricationNotes,
      showPcbNotes,
      showCourtyards,
      highlightedElementIds,
    ],
  )
  const sceneRef = useRef(elements)
  const viewRef = useRef<WebGpuRequest | undefined>(undefined)
  sceneRef.current = elements
  if (transform) {
    const ratio =
      typeof window === "undefined" ? 1 : window.devicePixelRatio || 1
    viewRef.current = {
      type: "view",
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio)),
      transform: {
        a: transform.a * ratio,
        b: transform.b * ratio,
        c: transform.c * ratio,
        d: transform.d * ratio,
        e: transform.e * ratio,
        f: transform.f * ratio,
      },
      options,
    }
  }
  useEffect(() => {
    let disposed = false,
      failed = false,
      worker: Worker | undefined
    const canvas = document.createElement("canvas")
    canvas.className = "pcb-webgpu-canvas"
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none"
    holder.current?.append(canvas)
    const fallback = (message: string) => {
      if (disposed || failed) return
      failed = true
      canvas.remove()
      ready.current = false
      worker?.terminate()
      workerRef.current = undefined
      setFailure(message)
    }
    const timeout = setTimeout(
      () => fallback("WebGPU worker startup timed out"),
      15000,
    )
    void (async () => {
      try {
        if (
          !navigator.gpu ||
          typeof Worker === "undefined" ||
          !canvas.transferControlToOffscreen
        )
          throw new Error("WebGPU workers are unavailable")
        worker = await createWebGpuWorker()
        if (disposed || failed) {
          worker.terminate()
          return
        }
        workerRef.current = worker
        worker.onmessage = ({ data }: MessageEvent<WebGpuResponse>) => {
          if (disposed || failed) return
          if (data.type === "error") {
            clearTimeout(timeout)
            fallback(data.message)
          } else if (data.type === "ready") {
            clearTimeout(timeout)
            ready.current = true
            worker!.postMessage({
              type: "scene",
              elements: sceneRef.current,
            } satisfies WebGpuRequest)
            if (viewRef.current) worker!.postMessage(viewRef.current)
          }
        }
        worker.onerror = (event) => {
          event.preventDefault()
          clearTimeout(timeout)
          fallback(event.message || "WebGPU worker failed")
        }
        worker.onmessageerror = () => {
          clearTimeout(timeout)
          fallback("WebGPU worker communication failed")
        }
        const offscreen = canvas.transferControlToOffscreen()
        worker.postMessage(
          { type: "init", canvas: offscreen } satisfies WebGpuRequest,
          [offscreen],
        )
      } catch (error) {
        clearTimeout(timeout)
        fallback(String(error))
      }
    })()
    return () => {
      disposed = true
      clearTimeout(timeout)
      ready.current = false
      workerRef.current = undefined
      worker?.terminate()
      canvas.remove()
    }
  }, [])
  useEffect(() => {
    if (ready.current)
      workerRef.current?.postMessage({
        type: "scene",
        elements,
      } satisfies WebGpuRequest)
  }, [elements])
  useEffect(() => {
    if (ready.current && viewRef.current)
      workerRef.current?.postMessage(viewRef.current)
  }, [transform, width, height, options])

  const fallbackElements = useMemo(
    () =>
      showCopperPours
        ? elements
        : elements.filter((e) => e.type !== "pcb_copper_pour"),
    [elements, showCopperPours],
  )
  if (failure)
    return (
      <div data-pcb-renderer="canvas" data-webgpu-fallback={failure}>
        <CanvasPrimitiveRenderer {...props} elements={fallbackElements} />
      </div>
    )
  return (
    <div
      ref={holder}
      data-pcb-renderer="webgpu"
      style={{
        width,
        height,
        background: "black",
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
    </div>
  )
}
