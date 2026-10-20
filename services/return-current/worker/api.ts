import {
  type Bucket,
  HttpError,
  type Job,
  jobIdPattern,
  json,
  resultKey,
  resultPath,
} from "./protocol"

export interface ApiOptions {
  bucket: Bucket
  coordinator: { fetch(request: Request): Promise<Response> }
  allowedOrigins: string[]
}

// Preserve the browser client's file envelope without duplicating a large result
// as both a complete UTF-16 string and a second escaped JSON string in memory.
export const fileEnvelope = (
  path: string,
  body: ReadableStream<Uint8Array>,
) => {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const reader = body.getReader()
  let stage = 0
  let released = false
  const release = () => {
    if (!released) {
      released = true
      reader.releaseLock()
    }
  }
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (stage === 0) {
          stage = 1
          controller.enqueue(
            encoder.encode(
              `{"file":{"file_path":${JSON.stringify(path)},"content":"`,
            ),
          )
          return
        }
        const { value, done } = await reader.read()
        if (done) {
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify(decoder.decode()).slice(1, -1)}"}}`,
            ),
          )
          controller.close()
          release()
        } else
          controller.enqueue(
            encoder.encode(
              JSON.stringify(decoder.decode(value, { stream: true })).slice(
                1,
                -1,
              ),
            ),
          )
      } catch (error) {
        controller.error(error)
        await reader.cancel(error).catch(() => {})
        release()
      }
    },
    async cancel(reason) {
      await reader.cancel(reason)
      release()
    },
  })
}

export const createApi =
  (options: ApiOptions) =>
  async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin")
    const allowed = !origin || options.allowedOrigins.includes(origin)
    const decorate = (response: Response) => {
      const headers = new Headers(response.headers)
      headers.set("Cache-Control", "no-store")
      headers.set("Vary", "Origin")
      if (origin && allowed) headers.set("Access-Control-Allow-Origin", origin)
      return new Response(response.body, { status: response.status, headers })
    }
    try {
      if (!allowed)
        throw new HttpError(
          403,
          "This origin is not allowed to use the simulation service",
        )
      if (request.method === "OPTIONS")
        return decorate(
          new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
              "Access-Control-Max-Age": "600",
            },
          }),
        )
      const url = new URL(request.url)
      const call = (path: string, init?: RequestInit) =>
        options.coordinator.fetch(
          new Request(`https://coordinator${path}`, init),
        )
      if (request.method === "GET" && url.pathname === "/api/health") {
        const metadata = await call("/meta")
        if (!metadata.ok)
          throw new HttpError(503, "Cloud job coordinator is unavailable")
        const limits = (await metadata.json()) as {
          remaining_daily_jobs: number
          queued_jobs: number
          queue_limit: number
        }
        const available =
          limits.remaining_daily_jobs > 0 &&
          limits.queued_jobs < limits.queue_limit
        return decorate(
          json({
            available,
            message:
              limits.remaining_daily_jobs <= 0
                ? "The cloud solver's daily preview budget has been reached; saved results remain available"
                : limits.queued_jobs >= limits.queue_limit
                  ? "The cloud simulation queue is full; saved results remain available"
                  : "Cloud Palace EM solver; a native container starts when a job is accepted",
            ...limits,
          }),
        )
      }
      if (request.method === "POST" && url.pathname === "/api/events/create") {
        if (
          request.headers
            .get("content-type")
            ?.split(";", 1)[0]
            ?.trim()
            .toLowerCase() !== "application/json"
        ) {
          throw new HttpError(
            415,
            "Simulation requests must use application/json",
          )
        }
        return decorate(
          await call("/submit", { method: "POST", body: request.body }),
        )
      }
      const match = /^\/api\/jobs\/([a-zA-Z0-9_-]+)$/.exec(url.pathname)
      if (request.method === "GET" && match && jobIdPattern.test(match[1]!)) {
        return decorate(await call(`/jobs/${match[1]}`))
      }
      if (request.method === "GET" && url.pathname === "/api/files/get") {
        const path = url.searchParams.get("file_path") ?? ""
        const fileMatch =
          /^return-current\/([a-zA-Z0-9_-]+)\/result\.circuit\.json$/.exec(path)
        if (!fileMatch || !jobIdPattern.test(fileMatch[1]!))
          throw new HttpError(400, "Invalid result file path")
        const id = fileMatch[1]!
        const statusResponse = await call(`/jobs/${id}`)
        if (!statusResponse.ok) return decorate(statusResponse)
        const status = (await statusResponse.json()) as { job: Job }
        if (
          status.job.status !== "completed" ||
          status.job.result_file_path !== resultPath(id)
        )
          throw new HttpError(409, "The simulation result is not ready")
        const object = await options.bucket.get(resultKey(id))
        if (!object)
          throw new HttpError(
            503,
            "The durable simulation result is unavailable",
          )
        return decorate(
          new Response(fileEnvelope(path, object.body), {
            headers: { "Content-Type": "application/json" },
          }),
        )
      }
      throw new HttpError(404, "Unknown simulation API route")
    } catch (error) {
      if (!(error instanceof HttpError))
        console.error("Simulation API error:", error)
      return decorate(
        json(
          {
            error:
              error instanceof HttpError
                ? error.message
                : "The simulation service could not complete this request",
          },
          error instanceof HttpError ? error.status : 500,
        ),
      )
    }
  }
