import { describe, expect, test } from "bun:test"
import { createApi, fileEnvelope } from "./api"
import {
  type Bucket,
  type ContainerTransport,
  HttpError,
  type Job,
  type Storage,
  inputKey,
  json,
  resultKey,
  resultPath,
  statusKey,
} from "./protocol"
import { DurableJobQueue } from "./queue"

const submission = (id = "protocol-job") => ({
  event_type: "REQUEST_RETURN_CURRENT_SIMULATION",
  request_id: id,
  circuit_json: [{ type: "pcb_board", width: 8, height: 6 }],
  experiment_id: "experiment",
  frequency_hz: 100_000_000,
  copper_model: "surface_impedance_copper",
  sample_layer: "bottom",
  cell_size: 0.05,
  mesh_size: 1,
  order: 1,
  air_padding: 2,
  processes: 1,
})
const body = (value: unknown) => new Response(JSON.stringify(value)).body!
const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const harness = (
  limits: { maxDailyJobs?: number; maxQueuedJobs?: number } = {},
) => {
  const values = new Map<string, unknown>()
  const objects = new Map<string, string>()
  let time = Date.UTC(2026, 9, 20)
  let alarm: number | undefined
  let nativeStatus = "running"
  let nativeResult = "[]" // Protocol payload only; no simulated field fixture.
  let failResultWrite = false
  const calls: string[] = []
  const storage: Storage = {
    get: async <T>(key: string) =>
      structuredClone(values.get(key)) as T | undefined,
    put: async (key, value) => {
      values.set(key, structuredClone(value))
    },
    setAlarm: async (value) => {
      alarm = value
    },
    deleteAlarm: async () => {
      alarm = undefined
    },
    transaction: async (operation) => operation(storage),
  }
  const bucket: Bucket = {
    get: async (key) => {
      const value = objects.get(key)
      return value === undefined
        ? null
        : {
            body: new Response(value).body!,
            size: new TextEncoder().encode(value).length,
            text: async () => value,
          }
    },
    put: async (key, value) => {
      if (failResultWrite && key.endsWith("result.circuit.json"))
        throw new Error("R2 write unavailable")
      objects.set(
        key,
        typeof value === "string" ? value : new TextDecoder().decode(value),
      )
    },
  }
  const containers: ContainerTransport = {
    fetch: async (name, path, _token, init) => {
      calls.push(`${init?.method ?? "GET"} ${name}${path}`)
      if (path === "/jobs") return json({ status: "running" }, 202)
      if (path.endsWith("/result"))
        return new Response(nativeResult, {
          headers: { "Content-Type": "application/json" },
        })
      const id = path.split("/").at(-1)
      return nativeStatus === "missing"
        ? json({ error: "missing" }, 404)
        : json({
            job: {
              request_id: id,
              status: nativeStatus,
              message: "Native status",
            },
          })
    },
    stop: async (name) => {
      calls.push(`STOP ${name}`)
      const id = name.replace(/-attempt-\d+$/, "")
      const status = JSON.parse(objects.get(statusKey(id)) ?? "{}") as Job
      if (status.status === "completed")
        expect(objects.has(resultKey(id))).toBe(true)
    },
  }
  const options = { storage, bucket, containers, now: () => time, ...limits }
  let queue = new DurableJobQueue(options)
  return {
    values,
    objects,
    storage,
    bucket,
    containers,
    calls,
    get queue() {
      return queue
    },
    get alarm() {
      return alarm
    },
    restart() {
      queue = new DurableJobQueue(options)
    },
    advance(ms: number) {
      time += ms
    },
    setStatus(status: string) {
      nativeStatus = status
    },
    setResult(value: string) {
      nativeResult = value
    },
    failWrites() {
      failResultWrite = true
    },
  }
}

describe("durable cloud job protocol", () => {
  test("deduplicates immutable request IDs and enforces daily/queue bounds", async () => {
    const h = harness({ maxDailyJobs: 2, maxQueuedJobs: 1 })
    expect((await h.queue.enqueue(body(submission()))).status).toBe(202)
    expect((await h.queue.enqueue(body(submission()))).status).toBe(200)
    await expect(
      h.queue.enqueue(body({ ...submission(), frequency_hz: 400_000_000 })),
    ).rejects.toMatchObject({ status: 409 })
    await expect(
      h.queue.enqueue(body(submission("second"))),
    ).rejects.toMatchObject({ status: 429 })
    await h.queue.alarm()
    expect((await h.queue.enqueue(body(submission("second")))).status).toBe(202)
    await expect(
      h.queue.enqueue(body(submission("third"))),
    ).rejects.toMatchObject({ status: 429 })
    expect(h.objects.has(inputKey("protocol-job"))).toBe(true)
    expect(
      JSON.parse(h.objects.get(statusKey("protocol-job"))!),
    ).not.toHaveProperty("token")
  })

  test("reconstructs active jobs, persists results before shutdown, and advances queue", async () => {
    const h = harness()
    await h.queue.enqueue(body(submission()))
    await h.queue.enqueue(body(submission("second")))
    await h.queue.alarm()
    h.restart()
    h.setStatus("completed")
    await h.queue.alarm()
    expect((await h.queue.getJob("protocol-job"))?.result_file_path).toBe(
      resultPath("protocol-job"),
    )
    expect(h.objects.get(resultKey("protocol-job"))).toBe("[]")
    expect(h.calls.filter((call) => call.startsWith("POST"))).toHaveLength(1)
    await h.queue.alarm()
    expect(h.calls.filter((call) => call.startsWith("POST"))).toHaveLength(2)
    expect((await h.queue.metadata()).remaining_daily_jobs).toBe(22)
  })

  test("native failure and runtime expiry remain failed across eviction", async () => {
    const h = harness()
    await h.queue.enqueue(body(submission()))
    await h.queue.alarm()
    h.setStatus("failed")
    await h.queue.alarm()
    h.restart()
    expect((await h.queue.getJob("protocol-job"))?.status).toBe("failed")
    await h.queue.enqueue(body(submission("timeout")))
    await h.queue.alarm()
    h.advance(900_001)
    await h.queue.alarm()
    expect((await h.queue.getJob("timeout"))?.message).toContain(
      "runtime limit",
    )
    expect(h.objects.has(resultKey("timeout"))).toBe(false)
  })

  test("restarts a lost native container once; never claims an unsaved result completed", async () => {
    const h = harness()
    await h.queue.enqueue(body(submission()))
    await h.queue.alarm()
    h.setStatus("missing")
    await h.queue.alarm()
    await h.queue.alarm()
    expect(h.calls.some((call) => call.includes("attempt-2/jobs"))).toBe(true)
    h.setStatus("completed")
    h.failWrites()
    await h.queue.alarm()
    expect((await h.queue.getJob("protocol-job"))?.status).toBe("running")
    await h.queue.alarm()
    await h.queue.alarm()
    expect((await h.queue.getJob("protocol-job"))?.status).toBe("failed")
    expect(h.objects.has(resultKey("protocol-job"))).toBe(false)
  })

  test("enqueue during a blocked native call cannot be overwritten by alarm cleanup", async () => {
    const h = harness()
    const entered = deferred()
    const release = deferred()
    const fetch = h.containers.fetch
    h.containers.fetch = async (...args) => {
      entered.resolve()
      await release.promise
      return fetch(...args)
    }
    await h.queue.enqueue(body(submission()))
    const tick = h.queue.alarm()
    await entered.promise
    await h.queue.enqueue(body(submission("second")))
    release.resolve()
    await tick
    h.setStatus("completed")
    await h.queue.alarm()
    await h.queue.alarm()
    expect(
      h.calls.some((call) => call.startsWith("POST second-attempt-1")),
    ).toBe(true)
  })

  test("alarm during a blocked enqueue preserves both jobs and its wakeup", async () => {
    const h = harness()
    await h.queue.enqueue(body(submission()))
    const entered = deferred()
    const release = deferred()
    const put = h.bucket.put
    h.bucket.put = async (key, value) => {
      if (key === inputKey("second")) {
        entered.resolve()
        await release.promise
      }
      return put(key, value)
    }
    const enqueue = h.queue.enqueue(body(submission("second")))
    await entered.promise
    const tick = h.queue.alarm()
    release.resolve()
    await Promise.all([enqueue, tick])
    expect((await h.queue.metadata()).queued_jobs).toBe(1)
    expect((await h.queue.metadata()).active_jobs).toBe(1)
    expect(h.alarm).toBeDefined()
  })

  test("rejects invalid geometry/sampling before consuming the compute budget", async () => {
    const h = harness()
    await expect(
      h.queue.enqueue(body({ ...submission(), cell_size: 0.00001 })),
    ).rejects.toBeInstanceOf(HttpError)
    await expect(
      h.queue.enqueue(
        body({
          ...submission(),
          circuit_json: [{ type: "pcb_board", width: 1000, height: 1000 }],
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
    expect((await h.queue.metadata()).remaining_daily_jobs).toBe(24)
  })

  test("limits actual outline extents rather than trusting nominal board dimensions", async () => {
    const h = harness()
    const oversized = {
      type: "pcb_board",
      width: 8,
      height: 6,
      outline: [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        { x: 1000, y: 1000 },
      ],
    }
    await expect(
      h.queue.enqueue(
        body({ ...submission(), cell_size: 1, circuit_json: [oversized] }),
      ),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      h.queue.enqueue(
        body({
          ...submission(),
          circuit_json: [
            {
              ...oversized,
              outline: [
                { x: 0, y: 0 },
                { x: "bad", y: 0 },
                { x: 8, y: 6 },
              ],
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      h.queue.enqueue(
        body({
          ...submission(),
          circuit_json: [
            { type: "pcb_board", width: 8, height: 6, thickness: 1_000_000 },
          ],
        }),
      ),
    ).rejects.toMatchObject({ status: 400 })
    expect((await h.queue.metadata()).remaining_daily_jobs).toBe(24)
    expect(h.objects.size).toBe(0)
  })
})

describe("public cloud API", () => {
  const setup = () => {
    const h = harness()
    const api = createApi({
      bucket: h.bucket,
      allowedOrigins: ["https://preview.example", "http://localhost:3000"],
      coordinator: {
        fetch: async (request) => {
          const path = new URL(request.url).pathname
          if (path === "/submit") return h.queue.enqueue(request.body)
          if (path === "/meta") return json(await h.queue.metadata())
          const job = await h.queue.getJob(path.split("/").at(-1)!)
          return job ? json({ job }) : json({ error: "not found" }, 404)
        },
      },
    })
    return { h, api }
  }
  test("exact CORS and JSON media checks; health does not start a solver", async () => {
    const { api, h } = setup()
    const response = await api(
      new Request("https://api/api/health", {
        headers: { origin: "https://preview.example" },
      }),
    )
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://preview.example",
    )
    expect((await response.json()).available).toBe(true)
    expect(h.calls).toHaveLength(0)
    expect(
      (
        await api(
          new Request("https://api/api/health", {
            headers: { origin: "https://preview.example.attacker" },
          }),
        )
      ).status,
    ).toBe(403)
    expect(
      (
        await api(
          new Request("https://api/api/events/create", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(415)
    expect(
      (
        await api(
          new Request("https://api/api/events/create", {
            method: "OPTIONS",
            headers: { origin: "http://localhost:3000" },
          }),
        )
      ).status,
    ).toBe(204)
  })

  test("only completed result paths can be fetched; streamed envelope preserves Unicode and escapes", async () => {
    const { api, h } = setup()
    expect(
      (
        await api(
          new Request("https://api/api/files/get?file_path=../../secret"),
        )
      ).status,
    ).toBe(400)
    await h.queue.enqueue(body(submission()))
    const url = `https://api/api/files/get?file_path=${encodeURIComponent(resultPath("protocol-job"))}`
    expect((await api(new Request(url))).status).toBe(409)
    const payload = JSON.stringify([{ label: 'µΩ "quoted"\n\\' }])
    h.setResult(payload)
    await h.queue.alarm()
    h.setStatus("completed")
    await h.queue.alarm()
    const response = await api(new Request(url))
    expect((await response.json()).file.content).toBe(payload)
    const bytes = new TextEncoder().encode(payload)
    const chunks = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]))
        controller.close()
      },
    })
    expect(
      (await new Response(fileEnvelope("path", chunks)).json()).file.content,
    ).toBe(payload)
  })

  test("result downloads honor backpressure and cancel the R2 stream", async () => {
    let reads = 0
    let cancelled = false
    const upstream = new ReadableStream<Uint8Array>({
      pull(controller) {
        reads++
        controller.enqueue(new TextEncoder().encode("a".repeat(1024)))
      },
      cancel() {
        cancelled = true
      },
    })
    const stream = fileEnvelope("path", upstream)
    const reader = stream.getReader()
    await reader.read() // envelope prefix
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(reads).toBeLessThanOrEqual(2) // upstream and wrapper allow one queued chunk each
    await reader.cancel("browser closed")
    expect(cancelled).toBe(true)
  })
})
