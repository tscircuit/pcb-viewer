import { LayerRenderController } from "../../src/lib/rendering/layer-render-controller"
import { createRenderWorker } from "../../src/lib/rendering/create-worker"
import { renderLayer } from "../../src/lib/rendering/render-layer"
import { getOrderedCanvasLayers } from "../../src/lib/copper-layers"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"
import type { RenderScene } from "../../src/lib/rendering/types"
import { createViewRequest } from "../../src/lib/rendering/view-request"

const camera = { a: 4, b: 0, c: 0, d: -4, e: 400, f: 300 }
const options: RenderScene["options"] = {
  selectedLayer: "top",
  hiddenLayerOpacity: 0.4,
  isShowingCopperPours: true,
  isShowingSolderMask: false,
  isShowingSilkscreen: true,
  isShowingFabricationNotes: false,
  isShowingPcbNotes: true,
  isShowingCourtyards: false,
}
let controller: LayerRenderController | undefined
let scene: RenderScene
let canvases: Record<string, HTMLCanvasElement>
const stats = {
  workers: 0,
  renders: 0,
  images: 0,
  scenes: 0,
  rasterCalls: 0,
  drawImages: 0,
  errors: [] as string[],
}
const ctxPrototype = CanvasRenderingContext2D.prototype
for (const name of [
  "stroke",
  "fill",
  "fillRect",
  "strokeRect",
  "fillText",
  "strokeText",
] as const) {
  const original = ctxPrototype[name] as Function
  ;(ctxPrototype as any)[name] = function (...args: any[]) {
    stats.rasterCalls++
    return original.apply(this, args)
  }
}
const originalDrawImage = ctxPrototype.drawImage
ctxPrototype.drawImage = function (...args: any[]) {
  stats.drawImages++
  return (originalDrawImage as Function).apply(this, args)
}
const workerFactory = async () => {
  stats.workers++
  const worker = await createRenderWorker()
  const post = worker.postMessage.bind(worker)
  worker.postMessage = ((message: any) => {
    if (message.type === "render") stats.renders++
    if (message.type === "scene") stats.scenes++
    post(message)
  }) as typeof worker.postMessage
  worker.addEventListener("message", ({ data }) => {
    if (data.type === "image") stats.images++
    if (data.type === "error") stats.errors.push(data.message)
  })
  return worker
}

async function setup(
  kind = "small",
  workerCount = 4,
  pixelRatio = 1,
  failure?: "constructor" | "runtime" | "unsupported",
) {
  controller?.dispose()
  Object.assign(stats, {
    workers: 0,
    renders: 0,
    images: 0,
    scenes: 0,
    rasterCalls: 0,
    drawImages: 0,
    errors: [],
  })
  const elements =
    kind === "am3352"
      ? await (
          await fetch("/src/examples/2026/repros/am3352-dev-board/circuit.json")
        ).json()
      : [
          {
            type: "pcb_board",
            pcb_board_id: "board",
            center: { x: 0, y: 0 },
            width: 100,
            height: 80,
            num_layers: 4,
            thickness: 1.6,
          },
          {
            type: "pcb_smtpad",
            pcb_smtpad_id: "pad",
            shape: "rect",
            x: 0,
            y: 0,
            width: 10,
            height: 8,
            layer: "top",
          },
          {
            type: "pcb_trace",
            pcb_trace_id: "trace",
            route: [
              { route_type: "wire", x: 0, y: 0, width: 1, layer: "top" },
              { route_type: "wire", x: 20, y: 20, width: 1, layer: "top" },
            ],
          },
        ]
  const start = performance.now()
  const primitives = elements.flatMap((e: any) =>
    convertElementToPrimitives(e, elements),
  )
  scene = { elements, primitives, options: { ...options } }
  const conversionMs = performance.now() - start
  const root = document.getElementById("viewer")!
  root.replaceChildren()
  canvases = Object.fromEntries(
    getOrderedCanvasLayers(elements)
      .filter((l) => !l.includes("soldermask"))
      .map((layer) => {
        const canvas = document.createElement("canvas")
        canvas.className = `pcb-layer-${layer}`
        canvas.style.cssText =
          "position:absolute;left:0;top:0;width:800px;height:600px"
        root.append(canvas)
        return [layer, canvas]
      }),
  )
  const originalWorker = globalThis.Worker
  const factory =
    failure === "constructor"
      ? () => {
          throw new Error("Worker blocked")
        }
      : failure === "runtime"
        ? () => {
            const url = URL.createObjectURL(
              new Blob(['throw new Error("Worker startup failed")'], {
                type: "text/javascript",
              }),
            )
            const worker = new Worker(url)
            URL.revokeObjectURL(url)
            return worker
          }
        : workerFactory
  if (failure === "unsupported") globalThis.Worker = undefined as any
  try {
    controller = new LayerRenderController(canvases, {
      workerCount,
      workerFactory: factory,
    })
  } finally {
    globalThis.Worker = originalWorker
  }
  controller.setScene(scene)
  controller.setView(camera, 800, 600, pixelRatio)
  return {
    elements: elements.length,
    primitives: primitives.length,
    conversionMs,
  }
}

async function parity() {
  const worker = await createRenderWorker()
  const response = (predicate: (data: any) => boolean) =>
    new Promise<any>((resolve, reject) => {
      const listener = ({ data }: MessageEvent) => {
        if (data.type === "error") {
          worker.removeEventListener("message", listener)
          reject(new Error(data.message))
        } else if (predicate(data)) {
          worker.removeEventListener("message", listener)
          resolve(data)
        }
      }
      worker.addEventListener("message", listener)
    })
  await response((d) => d.type === "ready")
  worker.postMessage({ type: "scene", revision: 1, scene })
  let compared = 0
  const differences: { layer: string; channels: number; maxDelta: number }[] =
    []
  try {
    for (const layer of Object.keys(canvases)) {
      const request = { ...createViewRequest(camera, 800, 600, 1), layer }
      const canvas = document.createElement("canvas")
      canvas.width = request.width
      canvas.height = request.height
      renderLayer(scene, request, canvas)
      const expected = canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height).data
      const pending = response((d) => d.type === "image")
      worker.postMessage({
        type: "render",
        id: ++compared,
        revision: 1,
        request,
      })
      const { image } = await pending
      const ctx = canvas.getContext("2d")!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0)
      image.close()
      const actual = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let changed = 0,
        maxDelta = 0
      for (let i = 0; i < actual.length; i++) {
        if (actual[i] !== expected[i]) changed++
        maxDelta = Math.max(maxDelta, Math.abs(actual[i] - expected[i]))
      }
      if (changed) differences.push({ layer, channels: changed, maxDelta })
      // GPU/CPU antialiasing can round a few color channels by one byte.
      if (maxDelta > 1 || changed > actual.length * 0.00001)
        throw new Error(
          `${layer}: ${changed} different channels, max delta ${maxDelta}`,
        )
    }
  } finally {
    worker.terminate()
  }
  return { compared, differences }
}

Object.assign(window, {
  validation: {
    setup,
    parity,
    stats,
    setView: (t = camera, ratio = 1) => controller!.setView(t, 800, 600, ratio),
    update: (next: Partial<RenderScene["options"]>) => {
      scene = { ...scene, options: { ...scene.options, ...next } }
      controller!.setScene(scene)
    },
    dispose: () => controller?.dispose(),
    pixelCount: (layer: string) => {
      const c = canvases[layer],
        data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data
      let count = 0
      for (let i = 3; i < data.length; i += 4) if (data[i]) count++
      return count
    },
  },
})
