import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { RenderWorkerPool } from "../../src/lib/rendering/render-worker-pool"
import type {
  LayerRenderRequest,
  RenderScene,
  WorkerRequest,
  WorkerResponse,
} from "../../src/lib/rendering/types"

class FakeWorker {
  onmessage?: (event: { data: WorkerResponse }) => void
  onerror?: (event: { preventDefault(): void }) => void
  onmessageerror?: () => void
  messages: WorkerRequest[] = []
  terminated = false
  postMessage(message: WorkerRequest) {
    this.messages.push(message)
  }
  terminate() {
    this.terminated = true
  }
  send(data: WorkerResponse) {
    this.onmessage?.({ data })
  }
}
const scene = {
  elements: [],
  primitives: [],
  options: {
    selectedLayer: "top",
    hiddenLayerOpacity: 0.4,
    isShowingCopperPours: true,
    isShowingSolderMask: false,
    isShowingSilkscreen: true,
    isShowingFabricationNotes: false,
    isShowingPcbNotes: true,
    isShowingCourtyards: false,
  },
} as RenderScene
const request = (key: string) => ({ key, layer: "top" }) as LayerRenderRequest
let workers: FakeWorker[], pool: RenderWorkerPool
const originalWorker = globalThis.Worker,
  originalCanvas = globalThis.OffscreenCanvas
beforeEach(() => {
  workers = []
  globalThis.Worker = FakeWorker as unknown as typeof Worker
  globalThis.OffscreenCanvas = class {} as unknown as typeof OffscreenCanvas
})
afterEach(() => {
  pool?.dispose()
  globalThis.Worker = originalWorker
  globalThis.OffscreenCanvas = originalCanvas
})
const factory = () => {
  const w = new FakeWorker()
  workers.push(w)
  return w as unknown as Worker
}

describe("worker scheduling", () => {
  it("bounds concurrency and replaces obsolete queued views", () => {
    pool = new RenderWorkerPool(2, factory, () => {})
    pool.setScene(scene)
    pool.request([request("a"), request("b"), request("old")])
    workers.forEach((w) => w.send({ type: "ready" }))
    expect(workers.map((w) => w.messages.length)).toEqual([2, 2])
    pool.request([request("new")])
    const running = workers[0].messages[1] as Extract<
      WorkerRequest,
      { type: "render" }
    >
    workers[0].send({
      type: "image",
      id: running.id,
      revision: running.revision,
      image: { close() {} } as ImageBitmap,
    })
    expect(workers[0].messages.at(-1)).toMatchObject({
      type: "render",
      request: { key: "new" },
    })
    expect(
      workers.flatMap((w) => w.messages).filter((m) => m.type === "scene"),
    ).toHaveLength(2)
  })
  it("closes results from a previous scene, and never presents them", () => {
    let presented = 0,
      closed = 0
    pool = new RenderWorkerPool(1, factory, () => presented++)
    pool.setScene(scene)
    workers[0].send({ type: "ready" })
    pool.request([request("old")])
    const job = workers[0].messages[1] as Extract<
      WorkerRequest,
      { type: "render" }
    >
    pool.setScene({ ...scene })
    workers[0].send({
      type: "image",
      id: job.id,
      revision: job.revision,
      image: {
        close() {
          closed++
        },
      } as ImageBitmap,
    })
    expect(closed).toBe(1)
    expect(presented).toBe(0)
  })
  it("pauses queued jobs while the camera is moving", () => {
    pool = new RenderWorkerPool(1, factory, () => {})
    pool.setScene(scene)
    workers[0].send({ type: "ready" })
    pool.request([request("a"), request("b")])
    pool.pause()
    const job = workers[0].messages[1] as Extract<
      WorkerRequest,
      { type: "render" }
    >
    workers[0].send({
      type: "image",
      id: job.id,
      revision: job.revision,
      image: { close() {} } as ImageBitmap,
    })
    expect(workers[0].messages).toHaveLength(2)
  })
  it("queues work while a lazy worker factory loads", async () => {
    let finish!: (worker: Worker) => void
    pool = new RenderWorkerPool(
      1,
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
      () => {},
    )
    pool.setScene(scene)
    pool.request([request("queued")])
    const worker = factory()
    finish(worker)
    await Promise.resolve()
    workers[0].send({ type: "ready" })
    expect(workers[0].messages.at(-1)).toMatchObject({
      type: "render",
      request: { key: "queued" },
    })
  })
  it("terminates a lazily created worker if the viewer has already unmounted", async () => {
    let finish!: (worker: Worker) => void
    pool = new RenderWorkerPool(
      1,
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
      () => {},
    )
    pool.dispose()
    finish(factory())
    await Promise.resolve()
    expect(workers[0].terminated).toBe(true)
  })
  it("terminates all workers and drops queued work on disposal", () => {
    pool = new RenderWorkerPool(4, factory, () => {})
    pool.dispose()
    expect(workers.every((w) => w.terminated)).toBe(true)
  })
})
