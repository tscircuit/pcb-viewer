import type { AnyCircuitElement } from "circuit-json"
import type { RenderOptions } from "@tscircuit/circuit-json-webgpu"
import type { GridConfig, Primitive } from "lib/types"
import { createWebGpuWorker } from "lib/webgpu/create-worker"
import type { WebGpuRequest, WebGpuResponse } from "lib/webgpu/protocol"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { SuperGrid, toMMSI } from "react-supergrid"
import type { Matrix } from "transformation-matrix"
import { useGlobalStore } from "../global-store"

type Props = {
  elements: AnyCircuitElement[]
  primitives: Primitive[]
  xRayElements?: AnyCircuitElement[]
  transform?: Matrix
  width?: number
  height?: number
  grid?: GridConfig
  onRenderComplete?: () => void
}

/** Retains a GPU canvas in a worker; the UI thread sends scene/camera changes only. */
export function WebGpuElementsRenderer(props: Props) {
  const { elements, primitives, transform, width = 500, height = 500 } = props
  const holder = useRef<HTMLDivElement>(null)
  const workerRef = useRef<Worker | undefined>(undefined)
  const onRenderCompleteRef = useRef(props.onRenderComplete)
  const sceneRef = useRef({ elements, sceneGeneration: 0 })
  const latestSubmittedSceneGenerationRef = useRef(0)
  const completedSceneGenerationRef = useRef(0)
  const ready = useRef(false)
  const [supportsXRayNet, setSupportsXRayNet] = useState<boolean | null>(null)
  const [failure, setFailure] = useState<string>()
  const selectedLayer = useGlobalStore((s) => s.selected_layer)
  const hiddenLayerOpacity = useGlobalStore((s) => s.hidden_layer_opacity)
  const copperPourOpacity = useGlobalStore((s) => s.copper_pour_opacity)
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
  const xRayElementIds = useMemo(
    () =>
      (props.xRayElements ?? []).map(
        (element) =>
          (element as unknown as Record<string, string>)[`${element.type}_id`],
      ),
    [props.xRayElements],
  )
  const options = useMemo<RenderOptions & { xRayElementIds: string[] }>(
    () => ({
      selectedLayer,
      hiddenLayerOpacity,
      copperPourOpacity,
      showCopperPours,
      showSolderMask,
      showSilkscreen,
      showFabricationNotes,
      showPcbNotes,
      showCourtyards,
      highlightedElementIds,
      xRayElementIds,
    }),
    [
      selectedLayer,
      hiddenLayerOpacity,
      copperPourOpacity,
      showCopperPours,
      showSolderMask,
      showSilkscreen,
      showFabricationNotes,
      showPcbNotes,
      showCourtyards,
      highlightedElementIds,
      xRayElementIds,
    ],
  )
  const viewRef = useRef<WebGpuRequest | undefined>(undefined)
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
  useLayoutEffect(() => {
    onRenderCompleteRef.current = props.onRenderComplete
  }, [props.onRenderComplete])
  useLayoutEffect(() => {
    const sceneGeneration = sceneRef.current.sceneGeneration + 1
    sceneRef.current = { elements, sceneGeneration }
    if (!ready.current || !workerRef.current) return
    latestSubmittedSceneGenerationRef.current = sceneGeneration
    workerRef.current.postMessage({
      type: "scene",
      elements,
      sceneGeneration,
    } satisfies WebGpuRequest)
  }, [elements])
  useEffect(() => {
    let disposed = false,
      failed = false,
      worker: Worker | undefined
    const canvas = document.createElement("canvas")
    canvas.className = "pcb-webgpu-canvas"
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none"
    holder.current?.append(canvas)
    const fail = (message: string) => {
      if (disposed || failed) return
      failed = true
      clearTimeout(timeout)
      canvas.remove()
      ready.current = false
      worker?.terminate()
      worker = undefined
      workerRef.current = undefined
      if (holder.current) holder.current.dataset.xRayNetActive = "false"
      setFailure(message)
    }
    const timeout = setTimeout(
      () => fail("WebGPU worker startup timed out"),
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
        worker.onmessage = (event: MessageEvent<WebGpuResponse>) => {
          if (disposed || failed) return
          const workerResponse = event.data
          if (workerResponse.type === "rendered") {
            if (
              workerResponse.sceneGeneration !==
                latestSubmittedSceneGenerationRef.current ||
              workerResponse.sceneGeneration ===
                completedSceneGenerationRef.current
            )
              return
            if (holder.current)
              holder.current.dataset.xRayNetActive = String(
                workerResponse.xRayActive,
              )
            completedSceneGenerationRef.current = workerResponse.sceneGeneration
            onRenderCompleteRef.current?.()
          } else if (workerResponse.type === "error") {
            fail(workerResponse.message)
          } else if (workerResponse.type === "ready") {
            clearTimeout(timeout)
            setSupportsXRayNet(workerResponse.supportsXRayNet)
            ready.current = true
            const scene = sceneRef.current
            latestSubmittedSceneGenerationRef.current = scene.sceneGeneration
            worker!.postMessage({
              type: "scene",
              elements: scene.elements,
              sceneGeneration: scene.sceneGeneration,
            } satisfies WebGpuRequest)
            if (viewRef.current) worker!.postMessage(viewRef.current)
          }
        }
        worker.onerror = (event) => {
          event.preventDefault()
          fail(event.message || "WebGPU worker failed")
        }
        worker.addEventListener("messageerror", () => {
          fail("WebGPU worker communication failed")
        })
        const offscreen = canvas.transferControlToOffscreen()
        worker.postMessage(
          { type: "init", canvas: offscreen } satisfies WebGpuRequest,
          [offscreen],
        )
      } catch (error) {
        fail(String(error))
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
    if (ready.current && viewRef.current)
      workerRef.current?.postMessage(viewRef.current)
  }, [transform, width, height, options])

  const xRayUnavailable = Boolean(
    props.xRayElements && supportsXRayNet === false,
  )
  return (
    <div
      ref={holder}
      data-pcb-renderer="webgpu"
      data-webgpu-error={failure}
      style={{
        width,
        height,
        background: "black",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {failure ? (
        <div
          role="alert"
          style={{ padding: 16, color: "white", position: "relative" }}
        >
          <strong>WebGPU rendering failed</strong>
          <div>{failure}</div>
        </div>
      ) : (
        <>
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
          {xRayUnavailable && (
            <div
              role="status"
              style={{ padding: 16, color: "white", position: "relative" }}
            >
              X-Ray is unavailable in this WebGPU renderer.
            </div>
          )}
        </>
      )}
    </div>
  )
}
