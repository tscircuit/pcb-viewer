import { randomUUID, createHash } from "node:crypto"
import { constants } from "node:fs"
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises"
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import { delimiter, join, resolve } from "node:path"
import { runNativeSimulation } from "./return-current/native-runner"
import {
  requestIdSchema,
  simulationRequestSchema,
  type Job,
  type SimulationRequest,
  type SimulationRunner,
  type StatusEvent,
} from "./return-current/protocol"

const relativeOutputDirectory = ".tscircuit/return-current-dev"
const maxRequestBytes = 32 * 1024 * 1024

const isAllowedOrigin = (
  origin: string | undefined,
  host: string | undefined,
) => {
  if (origin === undefined) return true
  try {
    const parsed = new URL(origin)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return false
    return (
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
      (host !== undefined && parsed.host === new URL(`http://${host}`).host)
    )
  } catch {
    return false
  }
}

const executableExists = async (command: string | undefined) => {
  if (!command) return false
  const candidates =
    command.includes("/") || command.includes("\\")
      ? [command]
      : (process.env.PATH ?? "")
          .split(delimiter)
          .map((directory) => join(directory, command))
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK)
      return true
    } catch {}
  }
  return false
}

const json = (response: ServerResponse, status: number, value: unknown) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  })
  response.end(JSON.stringify(value))
}

const readBody = async (request: IncomingMessage) => {
  let size = 0
  const chunks: string[] = []
  const decoder = new TextDecoder()
  for await (const chunk of request) {
    const bytes = new Uint8Array(chunk)
    size += bytes.length
    if (size > maxRequestBytes) throw new Error("Request exceeds 32 MiB")
    chunks.push(decoder.decode(bytes, { stream: true }))
  }
  return JSON.parse(chunks.join("") + decoder.decode())
}

/** Protocol adapter for pcb-viewer development. It accepts simulation jobs only;
 * it does not accept shell commands, executables or caller-selected output paths. */
export const createReturnCurrentDevServer = async ({
  projectDirectory = process.cwd(),
  runner = runNativeSimulation,
}: {
  projectDirectory?: string
  runner?: SimulationRunner
} = {}) => {
  const outputDirectory = resolve(projectDirectory, relativeOutputDirectory)
  await mkdir(outputDirectory, { recursive: true })
  const jobs = new Map<string, Job & { fingerprint: string }>()
  const queue: SimulationRequest[] = []
  const events: StatusEvent[] = []
  let sequence = 0
  let active = false
  let accepting = true
  let enqueueTail = Promise.resolve()

  const persist = async (job: Job & { fingerprint: string }) => {
    const directory = join(outputDirectory, job.request_id)
    await mkdir(directory, { recursive: true })
    await writeFile(
      join(directory, "job.json.tmp"),
      JSON.stringify(job, null, 2),
    )
    await rename(join(directory, "job.json.tmp"), join(directory, "job.json"))
  }

  const emit = (job: Job) => {
    const { request_id, status, updated_at, result_file_path, message } = job
    events.push({
      event_type: "RETURN_CURRENT_SIMULATION_STATUS",
      event_id: randomUUID(),
      sequence: ++sequence,
      request_id,
      status,
      created_at: updated_at,
      updated_at,
      ...(result_file_path ? { result_file_path } : {}),
      ...(message ? { message } : {}),
    })
    if (events.length > 2048) events.shift()
  }

  const update = async (requestId: string, patch: Partial<Job>) => {
    const job = {
      ...jobs.get(requestId)!,
      ...patch,
      updated_at: new Date().toISOString(),
    }
    jobs.set(requestId, job)
    await persist(job)
    emit(job)
  }

  // A restarted transport must not report an interrupted native solve as running.
  for (const entry of await readdir(outputDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory() || !requestIdSchema.safeParse(entry.name).success)
      continue
    try {
      const job = JSON.parse(
        await readFile(join(outputDirectory, entry.name, "job.json"), "utf8"),
      )
      if (job.request_id !== entry.name || typeof job.fingerprint !== "string")
        continue
      jobs.set(entry.name, job)
      if (job.status === "queued" || job.status === "running") {
        await update(entry.name, {
          status: "failed",
          message:
            "Development server restarted before completion; submit a new request ID",
        })
      }
    } catch {}
  }

  const drain = async () => {
    if (active) return
    active = true
    try {
      while (queue.length > 0) {
        const request = queue.shift()!
        try {
          await update(request.request_id, {
            status: "running",
            message: "Running Palace EM simulation",
          })
          const result = await runner(
            request,
            join(outputDirectory, request.request_id),
          )
          const resultFilePath = `${relativeOutputDirectory}/${request.request_id}/result.circuit.json`
          await writeFile(
            resolve(projectDirectory, resultFilePath),
            JSON.stringify(result, null, 2),
          )
          await update(request.request_id, {
            status: "completed",
            message: "Palace result is ready",
            result_file_path: resultFilePath,
          })
        } catch (error) {
          await update(request.request_id, {
            status: "failed",
            message: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } finally {
      active = false
    }
  }

  const publicJob = (job: Job & { fingerprint: string }) => {
    const { fingerprint, ...publicFields } = job
    return publicFields
  }

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost")
    try {
      if (request.method === "POST") {
        if (!isAllowedOrigin(request.headers.origin, request.headers.host)) {
          json(response, 403, {
            error: "Origin must be loopback or the same host",
          })
          return
        }
        const mediaType = request.headers["content-type"]
          ?.split(";")[0]
          .trim()
          .toLowerCase()
        if (mediaType !== "application/json") {
          json(response, 415, {
            error: "Content-Type must be application/json",
          })
          return
        }
      }
      if (request.method === "GET" && url.pathname === "/api/health") {
        const pythonAvailable = await executableExists(
          process.env.PALACE_PYTHON,
        )
        const palaceAvailable = await executableExists(process.env.PALACE_BIN)
        const dockerAvailable = await executableExists("docker")
        json(response, 200, {
          ok: true,
          backend: "palace",
          native_available: pythonAvailable && palaceAvailable,
          available: pythonAvailable && (palaceAvailable || dockerAvailable),
          python_available: pythonAvailable,
          palace_available: palaceAvailable,
          docker_available: dockerAvailable,
          message: pythonAvailable
            ? "Real Palace runs use PALACE_BIN when configured, otherwise Docker"
            : "Set PALACE_PYTHON to a Python environment with Gmsh and VTK",
        })
        return
      }
      if (request.method === "GET" && url.pathname === "/api/events/list") {
        const after = Number(url.searchParams.get("after") ?? 0)
        if (!Number.isSafeInteger(after) || after < 0) {
          json(response, 400, { error: "after must be a nonnegative integer" })
          return
        }
        json(response, 200, {
          event_list: events.filter((event) => event.sequence > after),
          cursor: sequence,
        })
        return
      }
      if (request.method === "POST" && url.pathname === "/api/events/create") {
        let input: SimulationRequest
        try {
          input = simulationRequestSchema.parse(await readBody(request))
        } catch (error) {
          json(response, 400, {
            error:
              error instanceof Error
                ? error.message
                : "Invalid simulation request",
          })
          return
        }
        const fingerprint = createHash("sha256")
          .update(JSON.stringify(input))
          .digest("hex")
        const enqueue = async () => {
          const previous = jobs.get(input.request_id)
          if (previous) {
            json(
              response,
              previous.fingerprint === fingerprint ? 200 : 409,
              previous.fingerprint === fingerprint
                ? { accepted: true, deduplicated: true, ...publicJob(previous) }
                : {
                    error:
                      "This request ID already belongs to a different simulation",
                  },
            )
            return
          }
          if (!accepting || queue.length >= 8) {
            json(response, 503, {
              error: "Simulation queue is full or the server is stopping",
            })
            return
          }
          const timestamp = new Date().toISOString()
          const job = {
            request_id: input.request_id,
            status: "queued" as const,
            created_at: timestamp,
            updated_at: timestamp,
            fingerprint,
          }
          await mkdir(join(outputDirectory, input.request_id), {
            recursive: true,
          })
          await writeFile(
            join(outputDirectory, input.request_id, "input.circuit.json"),
            JSON.stringify(input.circuit_json, null, 2),
          )
          await persist(job)
          jobs.set(input.request_id, job)
          queue.push(input)
          emit(job)
          json(response, 202, {
            accepted: true,
            deduplicated: false,
            ...publicJob(job),
          })
          void drain().catch((error) =>
            console.error("Return-current queue failed:", error),
          )
        }
        const enqueued = enqueueTail.then(enqueue)
        enqueueTail = enqueued.catch(() => {})
        await enqueued
        return
      }
      if (request.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
        const id = url.pathname.slice("/api/jobs/".length)
        const job = requestIdSchema.safeParse(id).success
          ? jobs.get(id)
          : undefined
        json(
          response,
          job ? 200 : 404,
          job ? { job: publicJob(job) } : { error: "Job not found" },
        )
        return
      }
      if (request.method === "GET" && url.pathname === "/api/files/get") {
        const path = url.searchParams.get("file_path") ?? ""
        const match =
          /^\.tscircuit\/return-current-dev\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,95})\/(result\.circuit\.json|input\.circuit\.json|job\.json)$/.exec(
            path,
          )
        if (!match || !jobs.has(match[1])) {
          json(response, 404, { error: "File not found" })
          return
        }
        try {
          const content = await readFile(
            join(outputDirectory, match[1], match[2]),
            "utf8",
          )
          json(response, 200, { file: { file_path: path, content } })
        } catch {
          json(response, 404, { error: "File not found" })
        }
        return
      }
      json(response, 404, { error: "Route not found" })
    } catch (error) {
      console.error("Return-current dev server:", error)
      if (!response.headersSent)
        json(response, 500, { error: "Development server request failed" })
      else response.end()
    }
  })
  server.on("close", () => {
    accepting = false
  })
  return server
}

if (import.meta.main) {
  const port = Number(process.env.RETURN_CURRENT_DEV_PORT ?? 3031)
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid RETURN_CURRENT_DEV_PORT")
  const server = await createReturnCurrentDevServer()
  server.listen(port, "127.0.0.1", () => {
    console.log(`Return-current development API: http://127.0.0.1:${port}`)
    console.log("Simulation results come from real Palace EM runs")
  })
}
