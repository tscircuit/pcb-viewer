import { afterEach, expect, test } from "bun:test"
import { once } from "node:events"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { AddressInfo } from "node:net"
import { createReturnCurrentDevServer } from "../return-current-dev-server"
import type { SimulationRunner } from "./protocol"

const cleanups: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

const start = async (runner: SimulationRunner, projectDirectory?: string) => {
  const directory =
    projectDirectory ??
    (await mkdtemp(join(tmpdir(), "return-current-protocol-")))
  if (!projectDirectory)
    cleanups.push(() => rm(directory, { recursive: true, force: true }))
  const server = await createReturnCurrentDevServer({
    projectDirectory: directory,
    runner,
  })
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const close = () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  cleanups.push(close)
  return { base, directory, close }
}

const request = (requestId: string) => ({
  request_id: requestId,
  circuit_json: [{ type: "pcb_board", pcb_board_id: "protocol-only-board" }],
  experiment_id: "simulation_experiment_protocol_only",
  frequency_hz: 100_000_000,
  copper_model: "surface_impedance_copper",
})

const post = (base: string, body: unknown) =>
  fetch(`${base}/api/simulations/v1/return-current/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

const waitForStatus = async (
  base: string,
  requestId: string,
  status: string,
) => {
  for (let attempt = 0; attempt < 100; attempt++) {
    const { job } = await (
      await fetch(`${base}/api/simulations/v1/return-current/jobs/${requestId}`)
    ).json()
    if (job?.status === status) return job
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`Job ${requestId} did not reach ${status}`)
}

test("queues one job at a time, deduplicates IDs, and serves ordered status/result data", async () => {
  let releaseFirst!: () => void
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve
  })
  let markFirstStarted!: () => void
  const firstStarted = new Promise<void>((resolve) => {
    markFirstStarted = resolve
  })
  const calls: string[] = []
  let active = 0
  let maxActive = 0
  const { base } = await start(async (input) => {
    calls.push(input.request_id)
    active++
    maxActive = Math.max(maxActive, active)
    if (input.request_id === "first") {
      markFirstStarted()
      await firstGate
    }
    active--
    // Protocol-only runner: no simulated fields or golden physics data.
    return input.circuit_json
  })
  try {
    expect((await post(base, request("first"))).status).toBe(202)
    await waitForStatus(base, "first", "running")
    await firstStarted
    expect((await post(base, request("first"))).status).toBe(200)
    expect(
      (await post(base, { ...request("first"), frequency_hz: 200_000_000 }))
        .status,
    ).toBe(409)
    expect((await post(base, request("second"))).status).toBe(202)
    expect(
      (
        await (
          await fetch(`${base}/api/simulations/v1/return-current/jobs/second`)
        ).json()
      ).job.status,
    ).toBe("queued")
    expect(calls).toEqual(["first"])
    releaseFirst()
    const completed = await waitForStatus(base, "second", "completed")
    expect(calls).toEqual(["first", "second"])
    expect(maxActive).toBe(1)

    const { event_list, cursor } = await (
      await fetch(
        `${base}/api/simulations/v1/return-current/events/list?after=0`,
      )
    ).json()
    expect(
      event_list.map((event: { sequence: number }) => event.sequence),
    ).toEqual([1, 2, 3, 4, 5, 6])
    expect(
      event_list
        .filter(
          (event: { request_id: string }) => event.request_id === "second",
        )
        .map((event: { status: string }) => event.status),
    ).toEqual(["queued", "running", "completed"])
    expect(
      (
        await (
          await fetch(
            `${base}/api/simulations/v1/return-current/events/list?after=${cursor}`,
          )
        ).json()
      ).event_list,
    ).toEqual([])

    const result = await (
      await fetch(
        `${base}/api/simulations/v1/return-current/jobs/second/result`,
      )
    ).json()
    expect(result).toEqual(request("second").circuit_json)
  } finally {
    releaseFirst()
  }
})

test("rejects invalid jobs and arbitrary file paths", async () => {
  let calls = 0
  const { base } = await start(async () => {
    calls++
    return []
  })
  for (const invalid of [
    { ...request("valid"), request_id: "../outside" },
    { ...request("valid"), frequency_hz: 0 },
    { ...request("valid"), processes: 1.5 },
    { ...request("valid"), command: "arbitrary executable" },
  ])
    expect((await post(base, invalid)).status).toBe(400)
  expect(
    (
      await fetch(
        `${base}/api/simulations/v1/return-current/events/list?after=-1`,
      )
    ).status,
  ).toBe(400)
  expect(
    (await fetch(`${base}/api/files/get?file_path=/etc/passwd`)).status,
  ).toBe(404)
  expect(calls).toBe(0)
})

test("requires JSON and rejects foreign browser origins while allowing loopback ports", async () => {
  let calls = 0
  const { base } = await start(async (input) => {
    calls++
    return input.circuit_json
  })
  for (const origin of [
    "https://foreign.example",
    "http://localhost.foreign.example:3000",
    "null",
  ]) {
    const response = await fetch(
      `${base}/api/simulations/v1/return-current/jobs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify(request("rejected-origin")),
      },
    )
    expect(response.status).toBe(403)
  }
  for (const mediaType of ["text/plain", "application/x-www-form-urlencoded"]) {
    const response = await fetch(
      `${base}/api/simulations/v1/return-current/jobs`,
      {
        method: "POST",
        headers: { "Content-Type": mediaType },
        body: JSON.stringify(request("rejected-media")),
      },
    )
    expect(response.status).toBe(415)
  }
  expect(calls).toBe(0)
  const origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3030",
    "http://[::1]:3000",
  ]
  for (const [index, origin] of origins.entries()) {
    const id = `allowed-origin-${index}`
    const response = await fetch(
      `${base}/api/simulations/v1/return-current/jobs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "Application/JSON; charset=utf-8",
          Origin: origin,
        },
        body: JSON.stringify(request(id)),
      },
    )
    expect(response.status).toBe(202)
    await waitForStatus(base, id, "completed")
  }
  expect(calls).toBe(3)
})

test("reports solver failures and recovers completed job status after restart", async () => {
  const runner: SimulationRunner = async (input) => {
    if (input.request_id === "failed") throw new Error("Native solver failed")
    return input.circuit_json
  }
  const first = await start(runner)
  await post(first.base, request("failed"))
  expect((await waitForStatus(first.base, "failed", "failed")).message).toBe(
    "Native solver failed",
  )
  await post(first.base, request("completed"))
  await waitForStatus(first.base, "completed", "completed")
  await first.close()
  cleanups.pop()

  let reruns = 0
  const second = await start(async () => {
    reruns++
    return []
  }, first.directory)
  expect(
    (
      await (
        await fetch(
          `${second.base}/api/simulations/v1/return-current/jobs/completed`,
        )
      ).json()
    ).job.status,
  ).toBe("completed")
  expect((await post(second.base, request("completed"))).status).toBe(200)
  expect(reruns).toBe(0)
})
