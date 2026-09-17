import type {
  LayerRenderRequest,
  RenderImage,
  RenderScene,
  WorkerRequest,
  WorkerResponse,
} from "./types"
import { closeImage } from "./types"

type Job = { id: number; revision: number; request: LayerRenderRequest }
type Slot = {
  worker: Worker
  ready: boolean
  revision: number
  job?: Job
  timer?: ReturnType<typeof setTimeout>
}

/** Latest-view queue. Workers receive the scene once per revision, not once per layer. */
export class RenderWorkerPool {
  private slots: Slot[] = []
  private queue: Job[] = []
  private scene?: RenderScene
  private revision = 0
  private nextId = 0
  private disposed = false
  private initializing = 0
  private failed = false
  private fallbackBusy = false
  private fallbackTimer?: ReturnType<typeof setTimeout>

  constructor(
    count: number,
    factory: () => Worker | Promise<Worker>,
    private onImage: (request: LayerRenderRequest, image: RenderImage) => void,
    private onError: (error: unknown) => void = console.error,
  ) {
    if (
      count <= 0 ||
      typeof Worker === "undefined" ||
      typeof OffscreenCanvas === "undefined"
    )
      return
    try {
      for (let i = 0; i < count; i++) {
        const result = factory()
        if (result instanceof Promise) {
          this.initializing++
          result
            .then((worker) => this.attach(worker))
            .catch(() => this.useFallback())
            .finally(() => {
              this.initializing--
              this.pump()
            })
        } else this.attach(result)
      }
    } catch {
      this.useFallback()
    }
  }

  private attach(worker: Worker) {
    if (this.disposed || this.failed) {
      worker.terminate()
      return
    }
    const slot: Slot = { worker, ready: false, revision: -1 }
    this.slots.push(slot)
    worker.onmessage = (event: MessageEvent<WorkerResponse>) =>
      this.receive(slot, event.data)
    worker.onerror = (event) => {
      event.preventDefault()
      this.useFallback()
    }
    worker.onmessageerror = () => this.useFallback()
    slot.timer = setTimeout(() => this.useFallback(), 5000)
  }

  setScene(scene: RenderScene) {
    this.scene = scene
    this.revision++
    this.queue = []
    // In-flight work may finish; revision checks dispose its stale bitmaps.
  }

  /** Replace queued work; leave at most one in-flight request per worker. */
  request(requests: LayerRenderRequest[]) {
    if (this.disposed) return
    const inFlight = new Set(
      this.slots.flatMap((s) =>
        s.job?.revision === this.revision ? [s.job.request.key] : [],
      ),
    )
    this.queue = requests
      .filter((r) => !inFlight.has(r.key))
      .map((request) => ({
        id: ++this.nextId,
        revision: this.revision,
        request,
      }))
    this.pump()
  }

  pause() {
    this.queue = []
  }

  private receive(slot: Slot, message: WorkerResponse) {
    if (this.disposed || !this.slots.includes(slot)) {
      if (message.type === "image") message.image.close()
      return
    }
    if (message.type === "error") {
      this.useFallback()
      return
    }
    if (message.type === "ready") {
      clearTimeout(slot.timer)
      slot.ready = true
    } else {
      const job = slot.job
      slot.job = undefined
      if (job && job.id === message.id && message.revision === this.revision) {
        this.onImage(job.request, message.image)
      } else message.image.close()
    }
    this.pump()
  }

  private pump() {
    if (this.disposed || !this.scene) return
    if (!this.slots.length) {
      if (this.initializing && !this.failed) return
      this.pumpFallback()
      return
    }
    for (const slot of this.slots) {
      if (!slot.ready || slot.job || !this.queue.length) continue
      const job = this.queue.shift()!
      slot.job = job
      try {
        if (slot.revision !== this.revision) {
          slot.worker.postMessage({
            type: "scene",
            revision: this.revision,
            scene: this.scene,
          } satisfies WorkerRequest)
          slot.revision = this.revision
        }
        slot.worker.postMessage({
          type: "render",
          ...job,
        } satisfies WorkerRequest)
      } catch {
        this.useFallback()
        return
      }
    }
  }

  private useFallback() {
    if (this.disposed) return
    this.failed = true
    const retry = this.slots.flatMap((slot) =>
      slot.job?.revision === this.revision ? [slot.job] : [],
    )
    for (const slot of this.slots) {
      clearTimeout(slot.timer)
      slot.worker.terminate()
    }
    this.slots = []
    this.queue = [...retry, ...this.queue]
    this.pump()
  }

  private pumpFallback() {
    if (this.fallbackBusy || !this.queue.length) return
    this.fallbackBusy = true
    // Yield between layers so input and cached-image presentation can run.
    this.fallbackTimer = setTimeout(async () => {
      let image: HTMLCanvasElement | undefined
      try {
        const { renderLayer } = await import("./render-layer")
        if (this.disposed) return
        const job = this.queue.shift()
        if (!job || !this.scene) return
        image = document.createElement("canvas")
        image.width = job.request.width
        image.height = job.request.height
        renderLayer(this.scene, job.request, image)
        if (job.revision === this.revision) this.onImage(job.request, image)
        else closeImage(image)
      } catch (error) {
        if (image) closeImage(image)
        this.onError(error)
      } finally {
        this.fallbackBusy = false
        this.pump()
      }
    }, 0)
  }

  dispose() {
    this.disposed = true
    clearTimeout(this.fallbackTimer)
    this.queue = []
    this.scene = undefined
    for (const slot of this.slots) {
      clearTimeout(slot.timer)
      slot.worker.terminate()
    }
    this.slots = []
  }
}
