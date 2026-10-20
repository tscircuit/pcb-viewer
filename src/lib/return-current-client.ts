import type { AnyCircuitElement, LayerRef } from "circuit-json"

export type ReturnCurrentSimulationJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"

export interface ReturnCurrentSimulationRequest {
  requestId: string
  circuitJson: readonly AnyCircuitElement[]
  experimentId: string
  frequencyHz: number
  sampleLayer: LayerRef
  cellSize: number
  meshSize: number
  order: 1 | 2
  copperModel: "surface_impedance_copper"
  airPadding: number
  processes: number
}

export interface ReturnCurrentSimulationJob {
  requestId: string
  status: ReturnCurrentSimulationJobStatus
  message?: string
  resultFilePath?: string
}

interface RequestOptions {
  signal?: AbortSignal
}

export interface ReturnCurrentSimulationClient {
  checkAvailability(options?: RequestOptions): Promise<{
    available: boolean
    message: string
  }>
  submit(
    request: ReturnCurrentSimulationRequest,
    options?: RequestOptions,
  ): Promise<ReturnCurrentSimulationJob>
  getJob(
    requestId: string,
    options?: RequestOptions,
  ): Promise<ReturnCurrentSimulationJob>
  loadResult(
    job: ReturnCurrentSimulationJob,
    options?: RequestOptions,
  ): Promise<AnyCircuitElement[]>
}

type BrowserFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException("Request aborted", "AbortError")
  }
}

const isAborted = (error: unknown, signal?: AbortSignal) =>
  signal?.aborted || (isObject(error) && error.name === "AbortError")

const readJob = (
  value: unknown,
  expectedRequestId: string,
): ReturnCurrentSimulationJob => {
  if (
    !isObject(value) ||
    typeof value.request_id !== "string" ||
    typeof value.status !== "string" ||
    !["queued", "running", "completed", "failed"].includes(value.status) ||
    (value.message !== undefined && typeof value.message !== "string") ||
    (value.result_file_path !== undefined &&
      typeof value.result_file_path !== "string")
  ) {
    throw new Error("Simulation server returned an invalid job response")
  }
  if (value.request_id !== expectedRequestId) {
    throw new Error("Simulation server returned a different simulation job")
  }
  return {
    requestId: value.request_id,
    status: value.status as ReturnCurrentSimulationJobStatus,
    ...(typeof value.message === "string" ? { message: value.message } : {}),
    ...(typeof value.result_file_path === "string"
      ? { resultFilePath: value.result_file_path }
      : {}),
  }
}

/** Browser HTTP adapter. baseUrl is the API prefix, such as /api or
 * https://return-current.example.workers.dev/api. Native execution stays on the server. */
export const createReturnCurrentSimulationClient = ({
  baseUrl = "/api",
  fetch: fetchOverride,
}: {
  baseUrl?: string
  fetch?: BrowserFetch
} = {}): ReturnCurrentSimulationClient => {
  const apiBase = baseUrl.replace(/\/+$/, "")
  const fetchRequest: BrowserFetch =
    fetchOverride ?? ((input, init) => globalThis.fetch(input, init))

  const requestJson = async (
    path: string,
    init: RequestInit,
    { signal }: RequestOptions = {},
  ): Promise<unknown> => {
    throwIfAborted(signal)
    let response: Response
    try {
      response = await fetchRequest(`${apiBase}${path}`, {
        ...init,
        signal,
        cache: "no-store",
      })
    } catch (error) {
      if (isAborted(error, signal)) throw error
      throw new Error(
        "Unable to reach the simulation server. Check the service URL and connection.",
      )
    }
    throwIfAborted(signal)
    const mediaType = response.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase()
    if (mediaType !== "application/json" && !mediaType?.endsWith("+json")) {
      throw new Error(
        `Simulation server returned a non-JSON response (HTTP ${response.status}). Check its API URL.`,
      )
    }
    let body: unknown
    try {
      body = await response.json()
    } catch (error) {
      if (isAborted(error, signal)) throw error
      throw new Error(
        `Simulation server returned invalid JSON (HTTP ${response.status})`,
      )
    }
    throwIfAborted(signal)
    if (!response.ok) {
      const detail = isObject(body)
        ? typeof body.error === "string"
          ? body.error
          : typeof body.message === "string"
            ? body.message
            : ""
        : ""
      throw new Error(
        `Simulation server request failed (HTTP ${response.status})${detail ? `: ${detail}` : ""}`,
      )
    }
    return body
  }

  return {
    async checkAvailability(options = {}) {
      try {
        const body = await requestJson("/health", { method: "GET" }, options)
        if (!isObject(body) || typeof body.available !== "boolean") {
          throw new Error(
            "Simulation server returned an invalid availability response",
          )
        }
        return {
          available: body.available,
          message:
            typeof body.message === "string" && body.message
              ? body.message
              : body.available
                ? "Simulation server is ready"
                : "The simulation runtime is unavailable",
        }
      } catch (error) {
        if (isAborted(error, options.signal)) throw error
        return {
          available: false,
          message:
            error instanceof Error
              ? error.message
              : "The simulation server is unavailable",
        }
      }
    },

    async submit(request, options) {
      const body = await requestJson(
        "/events/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "REQUEST_RETURN_CURRENT_SIMULATION",
            request_id: request.requestId,
            circuit_json: request.circuitJson,
            experiment_id: request.experimentId,
            frequency_hz: request.frequencyHz,
            copper_model: request.copperModel,
            sample_layer: request.sampleLayer,
            cell_size: request.cellSize,
            mesh_size: request.meshSize,
            order: request.order,
            air_padding: request.airPadding,
            processes: request.processes,
          }),
        },
        options,
      )
      if (!isObject(body) || body.accepted !== true) {
        throw new Error(
          "Simulation server did not accept the simulation request",
        )
      }
      return readJob(
        isObject(body) && isObject(body.job) ? body.job : body,
        request.requestId,
      )
    },

    async getJob(requestId, options) {
      const body = await requestJson(
        `/jobs/${encodeURIComponent(requestId)}`,
        { method: "GET" },
        options,
      )
      return readJob(isObject(body) ? body.job : undefined, requestId)
    },

    async loadResult(job, options) {
      throwIfAborted(options?.signal)
      if (job.status !== "completed")
        throw new Error("The simulation has not completed")
      if (!job.resultFilePath)
        throw new Error("Completed simulation did not provide a result file")
      const body = await requestJson(
        `/files/get?file_path=${encodeURIComponent(job.resultFilePath)}`,
        { method: "GET" },
        options,
      )
      if (
        !isObject(body) ||
        !isObject(body.file) ||
        typeof body.file.content !== "string"
      ) {
        throw new Error("Simulation server did not return Circuit JSON content")
      }
      let result: unknown
      try {
        result = JSON.parse(body.file.content)
      } catch {
        throw new Error("Simulation result is not valid JSON")
      }
      if (
        !Array.isArray(result) ||
        result.some(
          (element) => !isObject(element) || typeof element.type !== "string",
        )
      ) {
        throw new Error(
          "Simulation result must be a Circuit JSON element array",
        )
      }
      return result as AnyCircuitElement[]
    },
  }
}
