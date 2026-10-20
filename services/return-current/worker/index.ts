import { DurableObject } from "cloudflare:workers"
import { Container } from "@cloudflare/containers"
import { createApi } from "./api"
import { HttpError, jobIdPattern, json } from "./protocol"
import { DurableJobQueue } from "./queue"

export interface Env {
  JOBS: R2Bucket
  COORDINATOR: DurableObjectNamespace<ReturnCurrentCoordinator>
  SIMULATOR: DurableObjectNamespace<ReturnCurrentContainer>
  ALLOWED_ORIGINS: string
  MAX_DAILY_JOBS?: string
  MAX_QUEUED_JOBS?: string
  JOB_TIMEOUT_MS?: string
}

// Only the coordinator has a binding to this object. A per-job token is durable
// in both objects; neither the token nor the container endpoint is public.
export class ReturnCurrentContainer extends Container<Env> {
  defaultPort = 8080
  sleepAfter = "20m"
  enableInternet = false

  async fetch(request: Request): Promise<Response> {
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "")
    if (!token || !/^[a-zA-Z0-9-]{32,128}$/.test(token))
      return json({ error: "Unauthorized" }, 401)
    let existing = await this.ctx.storage.get<string>("job-token")
    if (!existing) {
      if (
        request.method !== "POST" ||
        new URL(request.url).pathname !== "/jobs"
      )
        return json({ error: "Job not started" }, 404)
      await this.ctx.storage.put("job-token", token)
      existing = token
    }
    if (existing !== token) return json({ error: "Unauthorized" }, 401)
    const path = new URL(request.url).pathname
    if (path === "/_control/stop" && request.method === "POST") {
      await this.destroy()
      return json({ stopped: true })
    }
    if (
      !(path === "/jobs" && request.method === "POST") &&
      !(
        /^\/jobs\/[a-zA-Z0-9_-]+(?:\/result)?$/.test(path) &&
        request.method === "GET"
      )
    ) {
      return json({ error: "Unknown internal route" }, 404)
    }
    this.envVars = {
      RETURN_CURRENT_CONTAINER_TOKEN: token,
      RETURN_CURRENT_MAX_RUNTIME_MS: "900000",
    }
    return this.containerFetch(request)
  }
}

const positiveInteger = (
  value: string | undefined,
  fallback: number,
  max: number,
) => {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max)
    throw new Error("Invalid service resource limit")
  return parsed
}

export class ReturnCurrentCoordinator extends DurableObject<Env> {
  private queue: DurableJobQueue

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.queue = new DurableJobQueue({
      storage: ctx.storage,
      bucket: env.JOBS,
      maxDailyJobs: positiveInteger(env.MAX_DAILY_JOBS, 24, 100),
      maxQueuedJobs: positiveInteger(env.MAX_QUEUED_JOBS, 4, 16),
      timeoutMs: positiveInteger(env.JOB_TIMEOUT_MS, 900_000, 900_000),
      containers: {
        fetch: (name, path, token, init = {}) =>
          env.SIMULATOR.get(env.SIMULATOR.idFromName(name)).fetch(
            new Request(`https://native${path}`, {
              ...init,
              headers: {
                ...Object.fromEntries(new Headers(init.headers)),
                Authorization: `Bearer ${token}`,
              },
              signal: AbortSignal.timeout(
                init.method === "POST"
                  ? 120_000
                  : path.endsWith("/result")
                    ? 120_000
                    : 30_000,
              ),
            }),
          ),
        stop: async (name, token) => {
          const response = await env.SIMULATOR.get(
            env.SIMULATOR.idFromName(name),
          ).fetch(
            new Request("https://native/_control/stop", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(30_000),
            }),
          )
          // A cold object with no token never started its native process.
          if (!response.ok && response.status !== 404)
            throw new Error(
              `Container cleanup failed (HTTP ${response.status})`,
            )
        },
      },
    })
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const path = new URL(request.url).pathname
      if (path === "/submit" && request.method === "POST")
        return await this.queue.enqueue(request.body)
      if (path === "/meta" && request.method === "GET")
        return json(await this.queue.metadata())
      const match = /^\/jobs\/([a-zA-Z0-9_-]+)$/.exec(path)
      if (request.method === "GET" && match && jobIdPattern.test(match[1]!)) {
        const job = await this.queue.getJob(match[1]!)
        return job
          ? json({ job })
          : json({ error: "Simulation job not found" }, 404)
      }
      return json({ error: "Unknown coordinator route" }, 404)
    } catch (error) {
      if (!(error instanceof HttpError))
        console.error("Coordinator error:", error)
      return json(
        {
          error:
            error instanceof HttpError
              ? error.message
              : "The durable job coordinator is unavailable",
        },
        error instanceof HttpError ? error.status : 503,
      )
    }
  }

  async alarm() {
    await this.queue.alarm()
  }
}

export default {
  fetch(request: Request, env: Env) {
    const coordinator = env.COORDINATOR.get(
      env.COORDINATOR.idFromName("global-queue-v1"),
    )
    return createApi({
      bucket: env.JOBS,
      coordinator,
      allowedOrigins: env.ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    })(request)
  },
}
