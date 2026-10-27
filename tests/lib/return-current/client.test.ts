import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  createReturnCurrentSimulationClient,
  type ReturnCurrentSimulationJob,
  type ReturnCurrentSimulationRequest,
} from "../../../src/lib/return-current/client"

// Transport-only PCB data: no simulated current values or physics snapshots.
const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_transport",
    center: { x: 0, y: 0 },
    width: 8,
    height: 6,
    thickness: 0.8,
    num_layers: 2,
    material: "fr4",
    custom_metadata: { source: "preserve this PCB metadata" },
  },
] as unknown as AnyCircuitElement[]

const simulationRequest: ReturnCurrentSimulationRequest = {
  requestId: "job-1",
  circuitJson,
  experimentId: "simulation_experiment_transport",
  frequencyHz: 400e6,
  sampleLayer: "bottom",
  cellSize: 0.01,
  meshSize: 1,
  order: 1,
  copperModel: "surface_impedance_copper",
  airPadding: 2,
  processes: 1,
}

const completedJob: ReturnCurrentSimulationJob = {
  requestId: "job-1",
  status: "completed",
}

test("maps browser requests and durable jobs to the namespaced hosted/local simulation protocol", async () => {
  const calls: { url: string; init?: RequestInit }[] = []
  const responses = [
    Response.json(
      { accepted: true, request_id: "job-1", status: "queued" },
      { status: 202 },
    ),
    Response.json({
      job: {
        request_id: "job-1",
        status: "completed",
        message: "Ready",
      },
    }),
    Response.json(circuitJson),
  ]
  const controller = new AbortController()
  const client = createReturnCurrentSimulationClient({
    baseUrl: "https://example.test/api/",
    fetch: async (input, init) => {
      calls.push({ url: String(input), init })
      return responses[calls.length - 1]
    },
  })
  expect(
    await client.submit(simulationRequest, { signal: controller.signal }),
  ).toEqual({ requestId: "job-1", status: "queued" })
  expect(calls[0].url).toBe(
    "https://example.test/api/simulations/v1/return-current/jobs",
  )
  expect(calls[0].init?.method).toBe("POST")
  expect(calls[0].init?.headers).toEqual({ "Content-Type": "application/json" })
  expect(calls[0].init?.signal).toBe(controller.signal)
  expect(JSON.parse(String(calls[0].init?.body))).toEqual({
    request_id: "job-1",
    circuit_json: circuitJson,
    experiment_id: simulationRequest.experimentId,
    frequency_hz: 400e6,
    copper_model: "surface_impedance_copper",
    sample_layer: "bottom",
    cell_size: 0.01,
    mesh_size: 1,
    order: 1,
    air_padding: 2,
    processes: 1,
  })
  const job = await client.getJob("job-1")
  expect(job).toEqual({ ...completedJob, message: "Ready" })
  expect(calls[1].url).toBe(
    "https://example.test/api/simulations/v1/return-current/jobs/job-1",
  )
  expect(await client.loadResult(job)).toEqual(circuitJson)
  expect(calls[2].url).toBe(
    "https://example.test/api/simulations/v1/return-current/jobs/job-1/result",
  )
})

test("availability reports runtime and connection failures clearly", async () => {
  const unavailable = createReturnCurrentSimulationClient({
    fetch: async () =>
      Response.json({
        available: false,
        message: "Configure the Palace Python environment",
      }),
  })
  expect(await unavailable.checkAvailability()).toEqual({
    available: false,
    message: "Configure the Palace Python environment",
  })

  const offline = createReturnCurrentSimulationClient({
    fetch: async () => {
      throw new TypeError("fetch failed")
    },
  })
  const offlineStatus = await offline.checkAvailability()
  expect(offlineStatus.available).toBe(false)
  expect(offlineStatus.message).toContain(
    "Unable to reach the simulation server",
  )

  const html = createReturnCurrentSimulationClient({
    fetch: async () =>
      new Response("<html>Vite fallback</html>", {
        headers: { "Content-Type": "text/html" },
      }),
  })
  const htmlStatus = await html.checkAvailability()
  expect(htmlStatus.available).toBe(false)
  expect(htmlStatus.message).toContain("non-JSON response")

  const invalid = createReturnCurrentSimulationClient({
    fetch: async () => Response.json({ ok: true }),
  })
  expect((await invalid.checkAvailability()).message).toContain(
    "invalid availability response",
  )
})

test("surfaces HTTP errors and rejects malformed or mismatched job acknowledgements", async () => {
  const rejected = createReturnCurrentSimulationClient({
    fetch: async () =>
      Response.json(
        { error: "This request ID belongs to another simulation" },
        { status: 409 },
      ),
  })
  await expect(rejected.submit(simulationRequest)).rejects.toThrow(
    "HTTP 409): This request ID belongs to another simulation",
  )

  const invalidJson = createReturnCurrentSimulationClient({
    fetch: async () =>
      new Response("{", { headers: { "Content-Type": "application/json" } }),
  })
  await expect(invalidJson.getJob("job-1")).rejects.toThrow("invalid JSON")

  const malformed = createReturnCurrentSimulationClient({
    fetch: async () =>
      Response.json({ job: { request_id: "job-1", status: ["queued"] } }),
  })
  await expect(malformed.getJob("job-1")).rejects.toThrow(
    "invalid job response",
  )

  const mismatched = createReturnCurrentSimulationClient({
    fetch: async () =>
      Response.json({
        job: { request_id: "another-job", status: "completed" },
      }),
  })
  await expect(mismatched.getJob("job-1")).rejects.toThrow(
    "different simulation job",
  )

  const notAccepted = createReturnCurrentSimulationClient({
    fetch: async () =>
      Response.json({ accepted: false, request_id: "job-1", status: "queued" }),
  })
  await expect(notAccepted.submit(simulationRequest)).rejects.toThrow(
    "did not accept",
  )
})

test("preserves cancellation for availability checks and in-flight job polling", async () => {
  const preAborted = new AbortController()
  const reason = new DOMException("Dialog closed", "AbortError")
  preAborted.abort(reason)
  let calls = 0
  const client = createReturnCurrentSimulationClient({
    fetch: async () => {
      calls++
      return Response.json({ available: true })
    },
  })
  await expect(
    client.checkAvailability({ signal: preAborted.signal }),
  ).rejects.toBe(reason)
  expect(calls).toBe(0)

  const controller = new AbortController()
  let receivedSignal: AbortSignal | null | undefined
  const pending = createReturnCurrentSimulationClient({
    fetch: async (_input, init) => {
      receivedSignal = init?.signal
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true },
        )
      })
    },
  })
  const polling = pending.getJob("job-1", { signal: controller.signal })
  controller.abort(reason)
  await expect(polling).rejects.toBe(reason)
  expect(receivedSignal).toBe(controller.signal)
})

test("loads only completed jobs and rejects malformed result content", async () => {
  let calls = 0
  const neverCalled = createReturnCurrentSimulationClient({
    fetch: async () => {
      calls++
      return Response.json({})
    },
  })
  await expect(
    neverCalled.loadResult({ requestId: "job-1", status: "running" }),
  ).rejects.toThrow("has not completed")
  expect(calls).toBe(0)

  const missing = createReturnCurrentSimulationClient({
    fetch: async () => Response.json({ file: {} }),
  })
  await expect(missing.loadResult(completedJob)).rejects.toThrow(
    "Circuit JSON element array",
  )
  for (const content of ["{}", "[null]", '[{"notAnElement":true}]']) {
    const invalid = createReturnCurrentSimulationClient({
      fetch: async () => Response.json(JSON.parse(content)),
    })
    await expect(invalid.loadResult(completedJob)).rejects.toThrow(
      "Circuit JSON element array",
    )
  }
  const broken = createReturnCurrentSimulationClient({
    fetch: async () =>
      new Response("{", { headers: { "Content-Type": "application/json" } }),
  })
  await expect(broken.loadResult(completedJob)).rejects.toThrow("invalid JSON")
})

test("same API base contract works with a CLI origin or hosted origin without using file paths", async () => {
  for (const baseUrl of [
    "/api",
    "http://localhost:3020/api/",
    "https://simulate.tscircuit.com/api",
  ]) {
    const calls: string[] = []
    const client = createReturnCurrentSimulationClient({
      baseUrl,
      fetch: async (url) => {
        calls.push(String(url))
        return Response.json(
          String(url).endsWith("/health") ? { available: true } : circuitJson,
        )
      },
    })
    expect((await client.checkAvailability()).available).toBe(true)
    expect(
      await client.loadResult({
        requestId: "job-1",
        status: "completed",
      }),
    ).toEqual(circuitJson)
    expect(calls).toEqual([
      `${baseUrl.replace(/\/+$/, "")}/simulations/v1/return-current/health`,
      `${baseUrl.replace(/\/+$/, "")}/simulations/v1/return-current/jobs/job-1/result`,
    ])
  }
})
