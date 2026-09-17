import { compose, inverse, scale, type Matrix } from "transformation-matrix"
import { Drawer } from "../Drawer"
import { createRenderWorker } from "./create-worker"
import { LayerImageCache } from "./image-cache"
import { RenderWorkerPool } from "./render-worker-pool"
import type { PcbRenderOptions, RenderScene, RenderImage } from "./types"
import { createViewRequest, getViewBox } from "./view-request"

/** The main-thread path only presents cached images and manages the request queue. */
export class LayerRenderController {
  private pool: RenderWorkerPool
  private cache: LayerImageCache
  private scene?: RenderScene
  private view?: {
    transform: Matrix
    width: number
    height: number
    pixelRatio: number
  }
  private settleTimer?: ReturnType<typeof setTimeout>
  private frame?: number
  private disposed = false
  private displayed = new Map<
    string,
    { frame: string; image?: RenderImage; canvas: HTMLCanvasElement }
  >()
  private settleDelay: number

  constructor(
    private canvases: Record<string, HTMLCanvasElement>,
    options: PcbRenderOptions = {},
  ) {
    const count = options.workerCount ?? 4
    this.settleDelay = Math.max(0, options.settleDelayMs ?? 120)
    this.cache = new LayerImageCache(
      Math.max(0, options.maxCacheBytes ?? 128 * 1024 * 1024),
    )
    this.pool = new RenderWorkerPool(
      Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 4,
      options.workerFactory ?? createRenderWorker,
      (request, image) => {
        this.cache.put(request, image)
        this.presentSoon()
      },
    )
  }

  setScene(scene: RenderScene) {
    if (this.scene?.elements === scene.elements) this.cache.invalidate()
    else this.cache.clear()
    this.scene = scene
    this.pool.setScene(scene)
    this.presentSoon()
    this.schedule()
  }

  setView(
    transform: Matrix,
    width: number,
    height: number,
    pixelRatio: number,
  ) {
    if (
      width <= 0 ||
      height <= 0 ||
      !Object.values(transform).every(Number.isFinite) ||
      Math.abs(transform.a * transform.d - transform.b * transform.c) < 1e-12
    )
      return
    this.view = { transform, width, height, pixelRatio }
    this.pool.pause()
    this.presentSoon()
    this.schedule()
  }

  private schedule() {
    clearTimeout(this.settleTimer)
    if (!this.view || !this.scene) return
    this.settleTimer = setTimeout(() => this.requestImages(), this.settleDelay)
  }

  private getDrawer() {
    const drawer = new Drawer(this.canvases)
    drawer.foregroundLayer = this.scene!.options.selectedLayer
    drawer.hiddenLayerOpacity = this.scene!.options.hiddenLayerOpacity
    return drawer
  }

  private requestImages() {
    if (this.disposed || !this.view || !this.scene) return
    const { transform, width, height, pixelRatio } = this.view
    const region = createViewRequest(transform, width, height, pixelRatio)
    const drawer = this.getDrawer()
    const options = this.scene.options
    const layers = Object.keys(this.canvases).filter(
      (layer) =>
        drawer.getLayerOpacity(layer) > 0 && this.isLayerEnabled(layer),
    )
    // Show the board and selected copper first, then fill in other layers.
    layers.sort(
      (a, b) =>
        Number(b === "board" || b === options.selectedLayer) -
        Number(a === "board" || a === options.selectedLayer),
    )
    this.pool.request(
      layers
        .map((layer) => ({ ...region, layer, key: `${layer}:${region.key}` }))
        .filter((r) => !this.cache.has(r.key)),
    )
  }

  private isLayerEnabled(layer: string) {
    const options = this.scene!.options
    if (!options.isShowingFabricationNotes && layer.includes("fabrication"))
      return false
    if (!options.isShowingPcbNotes && layer.includes("notes")) return false
    if (!options.isShowingCourtyards && layer.includes("courtyard"))
      return false
    if (!options.isShowingSolderMask && layer.includes("soldermask"))
      return false
    if (!options.isShowingSilkscreen && layer.includes("silkscreen"))
      return false
    return true
  }

  private presentSoon() {
    if (this.frame !== undefined || this.disposed) return
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined
      this.present()
    })
  }

  private present() {
    if (!this.view || !this.scene) return
    const { transform, width, height, pixelRatio } = this.view
    const camera = compose(scale(pixelRatio), transform)
    const viewBox = getViewBox(transform, width, height)
    const drawer = this.getDrawer()
    drawer.orderAndFadeLayers()
    const frame = [
      camera.a,
      camera.b,
      camera.c,
      camera.d,
      camera.e,
      camera.f,
      width,
      height,
    ].join(":")
    for (const layer of this.displayed.keys())
      if (!this.canvases[layer]) this.displayed.delete(layer)
    for (const [layer, canvas] of Object.entries(this.canvases)) {
      const w = Math.round(width * pixelRatio),
        h = Math.round(height * pixelRatio)
      const resized = canvas.width !== w || canvas.height !== h
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) continue
      const entry =
        drawer.getLayerOpacity(layer) > 0 && this.isLayerEnabled(layer)
          ? this.cache.best(layer, viewBox, Math.hypot(camera.a, camera.b))
          : undefined
      const previous = this.displayed.get(layer)
      // An arriving image only changes its own layer. Avoid repeatedly uploading
      // every other bitmap while the initial worker results stream in.
      if (
        !resized &&
        previous?.canvas === canvas &&
        previous.frame === frame &&
        previous.image === entry?.image
      )
        continue
      this.displayed.set(layer, { frame, image: entry?.image, canvas })
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (!entry) continue
      const delta = compose(camera, inverse(entry.request.transform))
      ctx.setTransform(delta.a, delta.b, delta.c, delta.d, delta.e, delta.f)
      ctx.drawImage(entry.image, 0, 0)
    }
  }

  dispose() {
    this.disposed = true
    clearTimeout(this.settleTimer)
    if (this.frame !== undefined) cancelAnimationFrame(this.frame)
    this.pool.dispose()
    this.cache.clear()
    this.displayed.clear()
  }
}
