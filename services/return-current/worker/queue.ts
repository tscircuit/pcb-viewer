import {
  type Bucket,
  type ContainerTransport,
  HttpError,
  type Job,
  MAX_INPUT_BYTES,
  MAX_RESULT_BYTES,
  type QueueState,
  type Storage,
  type StoredJob,
  inputKey,
  json,
  publicJob,
  readLimited,
  resultKey,
  resultPath,
  statusKey,
  validateRequest,
} from "./protocol"

export class DurableJobQueue {
  private stateTail = Promise.resolve()
  private ticking = false

  constructor(
    private options: {
      storage: Storage
      bucket: Bucket
      containers: ContainerTransport
      now?: () => number
      maxDailyJobs?: number
      maxQueuedJobs?: number
      timeoutMs?: number
    },
  ) {}

  private get now() {
    return this.options.now?.() ?? Date.now()
  }
  // Only short queue transitions are locked. Solver I/O never holds this lock.
  private locked<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.stateTail.then(operation)
    this.stateTail = next.then(
      () => {},
      () => {},
    )
    return next
  }
  private async state(): Promise<QueueState> {
    const state = (await this.options.storage.get<QueueState>("queue")) ?? {
      queue: [],
      active: null,
      day: "",
      acceptedToday: 0,
    }
    const day = new Date(this.now).toISOString().slice(0, 10)
    return state.day === day ? state : { ...state, day, acceptedToday: 0 }
  }

  async metadata() {
    const state = await this.state()
    return {
      active_jobs: state.active ? 1 : 0,
      queued_jobs: state.queue.length,
      remaining_daily_jobs: Math.max(
        0,
        (this.options.maxDailyJobs ?? 24) - state.acceptedToday,
      ),
      queue_limit: this.options.maxQueuedJobs ?? 4,
    }
  }

  async getJob(id: string): Promise<Job | null> {
    const stored = await this.options.storage.get<StoredJob>(`job:${id}`)
    if (stored) return publicJob(stored)
    const durable = await this.options.bucket.get(statusKey(id))
    return durable ? JSON.parse(await durable.text()) : null
  }

  async enqueue(body: ReadableStream<Uint8Array> | null) {
    const bytes = await readLimited(body, MAX_INPUT_BYTES)
    let value: unknown
    try {
      value = JSON.parse(new TextDecoder().decode(bytes))
    } catch {
      throw new HttpError(400, "Request is not valid JSON")
    }
    const request = validateRequest(value)
    const canonical = JSON.stringify(request)
    const digest = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonical),
      ),
    )
    const fingerprint = Array.from(digest, (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("")
    const enqueue = async () => {
      const previous = await this.options.storage.get<StoredJob>(
        `job:${request.request_id}`,
      )
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new HttpError(
            409,
            "Request ID already belongs to a different simulation",
          )
        if (previous.status === "queued" || previous.status === "running")
          await this.options.storage.setAlarm(this.now + 1_000)
        return json({
          accepted: true,
          deduplicated: true,
          ...publicJob(previous),
        })
      }
      const state = await this.state()
      if (state.acceptedToday >= (this.options.maxDailyJobs ?? 24))
        throw new HttpError(
          429,
          "The preview service's daily simulation budget has been reached",
        )
      if (state.queue.length >= (this.options.maxQueuedJobs ?? 4))
        throw new HttpError(
          429,
          "The simulation queue is full; try again after a job completes",
        )
      const timestamp = new Date(this.now).toISOString()
      const job: StoredJob = {
        request_id: request.request_id,
        status: "queued",
        created_at: timestamp,
        updated_at: timestamp,
        fingerprint,
        token: `${crypto.randomUUID()}${crypto.randomUUID()}`,
        attempt: 1,
        container: `${request.request_id}-attempt-1`,
        submitted: false,
        transportFailures: 0,
        message: "Waiting for the cloud solver",
      }
      await this.options.bucket.put(inputKey(job.request_id), canonical)
      await this.options.bucket.put(
        statusKey(job.request_id),
        JSON.stringify(publicJob(job)),
      )
      state.queue.push(job.request_id)
      state.acceptedToday++
      // The accepted job, its queue position and wakeup become durable together.
      await this.options.storage.transaction(async (transaction) => {
        await transaction.put(`job:${job.request_id}`, job)
        await transaction.put("queue", state)
        await transaction.setAlarm(this.now + 1_000)
      })
      return json(
        { accepted: true, deduplicated: false, ...publicJob(job) },
        202,
      )
    }
    return this.locked(enqueue)
  }

  private async save(job: StoredJob) {
    job.updated_at = new Date(this.now).toISOString()
    await this.options.bucket.put(
      statusKey(job.request_id),
      JSON.stringify(publicJob(job)),
    )
    await this.options.storage.put(`job:${job.request_id}`, job)
  }

  private async finish(
    job: StoredJob,
    status: "completed" | "failed",
    message: string,
  ) {
    job.status = status
    job.message = message.slice(0, 4_000)
    if (status === "completed")
      job.result_file_path = resultPath(job.request_id)
    await this.save(job)
  }

  private async cleanUp(job: StoredJob) {
    // Release the one physical instance only after its result/status is durable.
    await this.options.containers.stop(job.container, job.token)
    await this.locked(async () => {
      const current = await this.state()
      if (current.active === job.request_id) current.active = null
      await this.options.storage.put("queue", current)
    })
  }

  async alarm() {
    if (this.ticking) return
    this.ticking = true
    try {
      const state = await this.locked(async () => {
        const current = await this.state()
        if (!current.active && current.queue.length) {
          current.active = current.queue.shift()!
          await this.options.storage.put("queue", current)
        }
        return current
      })
      if (!state.active) return
      const job = await this.options.storage.get<StoredJob>(
        `job:${state.active}`,
      )
      if (!job) throw new Error("Active job metadata is missing")
      if (job.status === "completed" || job.status === "failed") {
        await this.cleanUp(job)
        return
      }
      if (!job.deadline) {
        job.deadline = this.now + (this.options.timeoutMs ?? 900_000)
        job.status = "running"
        job.message = "Starting the cloud Palace container"
        await this.save(job)
      }
      if (this.now >= job.deadline) {
        await this.finish(
          job,
          "failed",
          "Cloud simulation exceeded its runtime limit",
        )
        await this.cleanUp(job)
        return
      }
      if (!job.submitted) {
        const object = await this.options.bucket.get(inputKey(job.request_id))
        if (!object) throw new Error("Durable simulation input is missing")
        const response = await this.options.containers.fetch(
          job.container,
          "/jobs",
          job.token,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              request: JSON.parse(await object.text()),
              timeout_ms: job.deadline - this.now,
            }),
          },
        )
        if (!response.ok)
          throw new Error(
            `Solver container rejected the job (HTTP ${response.status}): ${(await response.text()).slice(0, 2_000)}`,
          )
        job.submitted = true
        job.message = "Running the Palace EM field solver"
        job.transportFailures = 0
        await this.save(job)
        return
      }
      const response = await this.options.containers.fetch(
        job.container,
        `/jobs/${encodeURIComponent(job.request_id)}`,
        job.token,
      )
      if (response.status === 404) {
        await this.options.containers.stop(job.container, job.token)
        if (job.attempt >= 2) {
          await this.finish(
            job,
            "failed",
            "The solver container restarted twice before its result was saved",
          )
          await this.cleanUp(job)
          return
        }
        job.attempt++
        job.container = `${job.request_id}-attempt-${job.attempt}`
        job.submitted = false
        job.message =
          "Solver container restarted; restarting from the durable input (attempt 2 of 2)"
        await this.save(job)
        return
      }
      if (!response.ok)
        throw new Error(
          `Solver status is unavailable (HTTP ${response.status})`,
        )
      const status = (await response.json()) as {
        job?: { request_id?: string; status?: string; message?: string }
      }
      if (status.job?.request_id !== job.request_id)
        throw new Error("Solver returned a different job")
      if (status.job.status === "failed") {
        await this.finish(
          job,
          "failed",
          status.job.message || "Palace simulation failed",
        )
        await this.cleanUp(job)
        return
      }
      if (status.job.status === "completed") {
        job.message = "Saving the completed EM result to durable storage"
        await this.save(job)
        const result = await this.options.containers.fetch(
          job.container,
          `/jobs/${encodeURIComponent(job.request_id)}/result`,
          job.token,
        )
        if (
          !result.ok ||
          !result.headers.get("content-type")?.includes("application/json")
        )
          throw new Error("Completed solver result is unavailable")
        const data = await readLimited(result.body, MAX_RESULT_BYTES)
        if (!data.byteLength) throw new Error("Solver returned an empty result")
        await this.options.bucket.put(resultKey(job.request_id), data)
        await this.finish(
          job,
          "completed",
          "Real Palace EM result is saved and ready",
        )
        await this.cleanUp(job)
        return
      }
      if (status.job.status !== "running" && status.job.status !== "queued")
        throw new Error("Solver returned an invalid job status")
      job.transportFailures = 0
      if (status.job.message) job.message = status.job.message.slice(0, 4_000)
      await this.save(job)
    } catch (error) {
      const state = await this.state()
      const job = state.active
        ? await this.options.storage.get<StoredJob>(`job:${state.active}`)
        : undefined
      if (!job) throw error
      if (job.status === "completed" || job.status === "failed") {
        // Retry container cleanup without changing an already durable outcome.
        console.error("Container cleanup will be retried:", String(error))
      } else {
        job.transportFailures++
        if (job.transportFailures >= 3) {
          await this.finish(
            job,
            "failed",
            error instanceof Error
              ? error.message
              : "Cloud solver communication failed",
          )
          await this.cleanUp(job)
        } else {
          job.message = `Cloud solver communication interrupted; retrying (${job.transportFailures}/3)`
          await this.save(job)
        }
      }
    } finally {
      this.ticking = false
      await this.locked(async () => {
        const state = await this.state()
        if (state.active || state.queue.length)
          await this.options.storage.setAlarm(this.now + 10_000)
        else await this.options.storage.deleteAlarm()
      })
    }
  }
}
