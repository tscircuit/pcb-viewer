import { expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createNativeContainerServer } from "./server"

test.skipIf(process.platform !== "linux")(
  "native supervisor authenticates, deduplicates, and kills the whole timed-out process group",
  async () => {
    const root = await mkdtemp(join(tmpdir(), "return-current-container-"))
    const fixture = join(root, "idle-worker.ts")
    const childPidPath = join(root, "descendant.pid")
    // Transport/lifecycle test only: no synthetic EM fields or result assets.
    await writeFile(
      fixture,
      `
import { spawn } from "node:child_process"
import { writeFile } from "node:fs/promises"
const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {detached: true})
await writeFile(${JSON.stringify(childPidPath)}, String(child.pid))
setInterval(() => {}, 1000)
`,
    )
    const service = await createNativeContainerServer({
      token: "test-secret",
      jobRoot: join(root, "jobs"),
      port: 0,
      hostname: "127.0.0.1",
      maxRuntimeMs: 2000,
      workerEntrypoint: fixture,
    })
    const base = `http://127.0.0.1:${service.server.port}`
    const headers = {
      Authorization: "Bearer test-secret",
      "Content-Type": "application/json",
    }
    const request = {
      event_type: "REQUEST_RETURN_CURRENT_SIMULATION",
      request_id: "timeout-test",
      circuit_json: [{ type: "pcb_board", pcb_board_id: "board" }],
      experiment_id: "experiment",
      frequency_hz: 400e6,
      copper_model: "surface_impedance_copper",
    }
    try {
      expect((await fetch(`${base}/health`)).status).toBe(200)
      expect((await fetch(`${base}/jobs/timeout-test`)).status).toBe(401)
      expect(
        (
          await fetch(`${base}/jobs/timeout-test`, {
            headers: { Authorization: "Bearer tést-secret" },
          })
        ).status,
      ).toBe(401)
      expect(
        (
          await fetch(`${base}/jobs`, {
            method: "POST",
            headers,
            body: JSON.stringify({ request, timeout_ms: 3000 }),
          })
        ).status,
      ).toBe(400)
      expect(
        (
          await fetch(`${base}/jobs`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              request,
              timeout_ms: 800,
              executable: "not-accepted",
            }),
          })
        ).status,
      ).toBe(400)
      const submit = (value: unknown) =>
        fetch(`${base}/jobs`, {
          method: "POST",
          headers,
          body: JSON.stringify({ request: value, timeout_ms: 800 }),
        })
      expect((await submit(request)).status).toBe(202)
      expect((await submit(request)).status).toBe(202)
      expect((await submit({ ...request, frequency_hz: 100e6 })).status).toBe(
        409,
      )
      expect(
        (await submit({ ...request, request_id: "another-job" })).status,
      ).toBe(409)
      let descendant = 0
      for (let attempt = 0; attempt < 30; attempt++) {
        try {
          descendant = Number(await readFile(childPidPath, "utf8"))
          break
        } catch {}
        await Bun.sleep(10)
      }
      expect(descendant).toBeGreaterThan(0)
      let status = "running"
      for (let attempt = 0; attempt < 100; attempt++) {
        const response = await fetch(`${base}/jobs/timeout-test`, { headers })
        status = (await response.json()).job.status
        if (status === "failed") break
        await Bun.sleep(20)
      }
      expect(status).toBe("failed")
      expect(
        (await fetch(`${base}/jobs/timeout-test/result`, { headers })).status,
      ).toBe(409)
      await Bun.sleep(50)
      let running = false
      try {
        const state = (await readFile(`/proc/${descendant}/stat`, "utf8"))
          .split(") ")[1]
          .split(" ")[0]
        running = state !== "Z" && state !== "X"
      } catch {}
      expect(running).toBe(false)
    } finally {
      await service.stop()
      await rm(root, { recursive: true, force: true })
    }
  },
  { timeout: 10_000 },
)
