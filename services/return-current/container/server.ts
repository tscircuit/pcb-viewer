import { spawn, type ChildProcess } from "node:child_process"
import { createHash, timingSafeEqual } from "node:crypto"
import { closeSync, openSync, readFileSync, readdirSync } from "node:fs"
import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from "node:fs/promises"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  requestIdSchema,
  simulationRequestSchema,
} from "../../../scripts/return-current/protocol"
import type { SimulationRequest } from "../../../scripts/return-current/protocol"

const MAX_REQUEST_BYTES = 32 * 1024 * 1024
const MAX_RESULT_BYTES = 32 * 1024 * 1024
const DEFAULT_MAX_RUNTIME_MS = 20 * 60 * 1000
type NativeJob = {
  request_id: string
  status: "running" | "completed" | "failed"
  message?: string
  fingerprint: string
  created_at: string
  updated_at: string
}

const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  })

export async function createNativeContainerServer({
  token = process.env.RETURN_CURRENT_CONTAINER_TOKEN ?? "",
  jobRoot = process.env.RETURN_CURRENT_JOB_ROOT ?? "/work/jobs",
  port = Number(process.env.PORT ?? 8080),
  hostname = "0.0.0.0",
  maxRuntimeMs = Number(
    process.env.RETURN_CURRENT_MAX_RUNTIME_MS ?? DEFAULT_MAX_RUNTIME_MS,
  ),
  workerEntrypoint = fileURLToPath(new URL("./worker.ts", import.meta.url)),
}: {
  token?: string
  jobRoot?: string
  port?: number
  hostname?: string
  maxRuntimeMs?: number
  /** Trusted supervisor configuration, never accepted in an HTTP request. */
  workerEntrypoint?: string
} = {}) {
  if (!token) throw new Error("RETURN_CURRENT_CONTAINER_TOKEN is required")
  if (!Number.isSafeInteger(maxRuntimeMs) || maxRuntimeMs < 1)
    throw new Error("Invalid maximum job duration")
  jobRoot = resolve(jobRoot)
  await mkdir(jobRoot, { recursive: true })
  let job: NativeJob | undefined
  let child: ChildProcess | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let enqueueTail = Promise.resolve()

  const directory = (id: string) => join(jobRoot, id)
  const persist = async () => {
    if (!job) return
    const target = join(directory(job.request_id), "job.json")
    await writeFile(`${target}.tmp`, JSON.stringify(job))
    await rename(`${target}.tmp`, target)
  }
  const publicJob = () => {
    if (!job) return undefined
    const { fingerprint, ...value } = job
    return value
  }
  const killTree = () => {
    if (!child?.pid) return
    const rootPid = child.pid
    const signal = (pid: number, name: NodeJS.Signals) => {
      try {
        process.kill(pid, name)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error
      }
    }
    // MPI Hydra starts new sessions: a negative PGID alone misses its ranks.
    // Freeze each parent before rescanning /proc so it cannot fork new children
    // between discovery and termination. In the dedicated PID namespace the
    // HTTP supervisor also adopts any orphaned MPI descendants.
    const processes = new Set<number>([rootPid])
    if (process.pid === 1) processes.add(process.pid)
    signal(rootPid, "SIGSTOP")
    let discovered: boolean
    do {
      discovered = false
      for (const name of readdirSync("/proc")) {
        if (!/^\d+$/.test(name)) continue
        const pid = Number(name)
        if (processes.has(pid)) continue
        try {
          const stat = readFileSync(`/proc/${pid}/stat`, "utf8")
          const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ")
          const parentPid = Number(fields[1])
          if (!processes.has(parentPid)) continue
          signal(pid, "SIGSTOP")
          processes.add(pid)
          discovered = true
        } catch (error) {
          if (
            (error as NodeJS.ErrnoException).code !== "ENOENT" &&
            (error as NodeJS.ErrnoException).code !== "ESRCH"
          )
            throw error
        }
      }
    } while (discovered)
    for (const pid of [...processes].reverse())
      if (pid !== process.pid) signal(pid, "SIGKILL")
    signal(-rootPid, "SIGKILL")
  }
  const finish = async (status: "completed" | "failed", message: string) => {
    if (!job || job.status !== "running") return
    job = { ...job, status, message, updated_at: new Date().toISOString() }
    if (timer) clearTimeout(timer)
    await persist()
  }

  // A process/container restart cannot pretend an interrupted solve is running.
  for (const entry of await readdir(jobRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !requestIdSchema.safeParse(entry.name).success)
      continue
    const path = join(directory(entry.name), "job.json")
    try {
      const stored = JSON.parse(await readFile(path, "utf8")) as NativeJob
      if (
        stored.request_id !== entry.name ||
        typeof stored.fingerprint !== "string"
      )
        continue
      if (job) throw new Error("Container contains more than one immutable job")
      job = stored
      if (job.status === "running")
        await finish(
          "failed",
          "Container restarted before the native solve completed",
        )
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
  }

  const start = async (
    request: SimulationRequest,
    timeoutMs: number,
    fingerprint: string,
  ) => {
    const now = new Date().toISOString()
    job = {
      request_id: request.request_id,
      status: "running",
      fingerprint,
      created_at: now,
      updated_at: now,
    }
    const root = directory(request.request_id)
    await mkdir(root, { recursive: true })
    const requestPath = join(root, "request.json")
    await writeFile(requestPath, JSON.stringify(request))
    await persist()
    const log = openSync(join(root, "supervisor.log"), "a")
    try {
      child = spawn(process.execPath, [workerEntrypoint, requestPath, root], {
        detached: true,
        env: process.env,
        stdio: ["ignore", log, log],
      })
    } finally {
      closeSync(log)
    }
    timer = setTimeout(() => {
      // finish assigns failed synchronously; kill before awaiting disk writes so
      // even a full/unresponsive filesystem cannot leave the solver running.
      const finished = finish(
        "failed",
        `Native simulation exceeded its ${timeoutMs} ms deadline`,
      )
      killTree()
      void finished.catch((error) =>
        console.error("Native job deadline:", error),
      )
    }, timeoutMs)
    child.once(
      "error",
      (error) => void finish("failed", error.message).catch(console.error),
    )
    child.once("exit", (code, signal) => {
      // An abruptly exiting supervisor must not leave native descendants behind.
      // Clear the handle afterwards so shutdown never signals a recycled PID.
      killTree()
      child = undefined
      void (async () => {
        if (!job || job.status !== "running") return
        if (code === 0) {
          const result = await stat(join(root, "result.circuit.json"))
          if (result.size < 2 || result.size > MAX_RESULT_BYTES)
            throw new Error("Native result has an invalid size")
          await finish("completed", "Palace result is ready")
          return
        }
        let message = `Native simulation exited with ${signal ?? code}`
        try {
          message =
            JSON.parse(await readFile(join(root, "failure.json"), "utf8"))
              .message ?? message
        } catch {}
        await finish("failed", String(message).slice(0, 2048))
      })().catch(
        (error) => void finish("failed", String(error)).catch(console.error),
      )
    })
  }

  const server = Bun.serve({
    port,
    hostname,
    maxRequestBodySize: MAX_REQUEST_BYTES,
    async fetch(request) {
      const url = new URL(request.url)
      if (request.method === "GET" && url.pathname === "/health")
        return json({ ok: true, backend: "palace", native: true })
      const supplied = request.headers.get("Authorization") ?? ""
      const expected = `Bearer ${token}`
      const suppliedBytes = new TextEncoder().encode(supplied)
      const expectedBytes = new TextEncoder().encode(expected)
      if (
        suppliedBytes.length !== expectedBytes.length ||
        !timingSafeEqual(suppliedBytes, expectedBytes)
      )
        return json({ error: "Unauthorized" }, 401)
      if (request.method === "POST" && url.pathname === "/jobs") {
        let input: { request: SimulationRequest; timeout_ms: number }
        try {
          if (
            request.headers
              .get("Content-Type")
              ?.split(";")[0]
              .trim()
              .toLowerCase() !== "application/json"
          )
            return json({ error: "Content-Type must be application/json" }, 415)
          const body = await request.json()
          if (
            !body ||
            Object.keys(body).some(
              (key) => key !== "request" && key !== "timeout_ms",
            )
          )
            throw new Error("Expected request and timeout_ms")
          const timeout = body.timeout_ms
          if (
            !Number.isSafeInteger(timeout) ||
            timeout < 1 ||
            timeout > maxRuntimeMs
          )
            throw new Error(`timeout_ms must be between 1 and ${maxRuntimeMs}`)
          input = {
            request: simulationRequestSchema.parse(body.request),
            timeout_ms: timeout,
          }
        } catch (error) {
          return json(
            {
              error:
                error instanceof Error ? error.message : "Invalid native job",
            },
            400,
          )
        }
        const fingerprint = createHash("sha256")
          .update(JSON.stringify(input.request))
          .digest("hex")
        let response: Response | undefined
        const operation = enqueueTail.then(async () => {
          if (job) {
            response =
              job.request_id === input.request.request_id &&
              job.fingerprint === fingerprint
                ? json({ accepted: true, ...publicJob() }, 202)
                : json(
                    {
                      error: "Container already owns a different immutable job",
                    },
                    409,
                  )
            return
          }
          await start(input.request, input.timeout_ms, fingerprint)
          response = json({ accepted: true, ...publicJob() }, 202)
        })
        enqueueTail = operation.catch(() => {})
        try {
          await operation
        } catch (error) {
          await finish(
            "failed",
            error instanceof Error
              ? error.message
              : "Could not start native job",
          )
          return json({ error: "Could not start native job" }, 500)
        }
        return response!
      }
      const match =
        /^\/jobs\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,95})(\/result)?$/.exec(
          url.pathname,
        )
      if (request.method === "GET" && match) {
        if (!job || match[1] !== job.request_id)
          return json({ error: "Job not found" }, 404)
        if (!match[2]) return json({ job: publicJob() })
        if (job.status !== "completed")
          return json({ error: "Result is not ready" }, 409)
        const file = Bun.file(
          join(directory(job.request_id), "result.circuit.json"),
        )
        return new Response(file, {
          headers: {
            "Content-Type": "application/json",
            "Content-Length": String(file.size),
            "Cache-Control": "no-store",
          },
        })
      }
      return json({ error: "Route not found" }, 404)
    },
    error(error) {
      console.error("Native container HTTP:", error)
      return json({ error: "Native container request failed" }, 500)
    },
  })
  return {
    server,
    async stop() {
      const finished = finish(
        "failed",
        "Container stopped while the native solve was running",
      )
      killTree()
      server.stop(true)
      await finished
    },
  }
}

if (import.meta.main) {
  const instance = await createNativeContainerServer()
  console.log(
    `Native Palace HTTP supervisor listening on ${instance.server.port}`,
  )
  const shutdown = () => void instance.stop().finally(() => process.exit(0))
  process.once("SIGTERM", shutdown)
  process.once("SIGINT", shutdown)
}
