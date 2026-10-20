import { simulationRequestSchema } from "../../../scripts/return-current/protocol"
import type { SimulationRequest } from "../../../scripts/return-current/protocol"

export type { SimulationRequest }
export const requestSchema = simulationRequestSchema
export const jobIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/
export const MAX_INPUT_BYTES = 8 * 1024 * 1024
export const MAX_RESULT_BYTES = 32 * 1024 * 1024

export interface Job {
  request_id: string
  status: "queued" | "running" | "completed" | "failed"
  created_at: string
  updated_at: string
  message?: string
  result_file_path?: string
}

export interface StoredJob extends Job {
  fingerprint: string
  token: string
  attempt: number
  container: string
  submitted: boolean
  deadline?: number
  transportFailures: number
}

export interface QueueState {
  queue: string[]
  active: string | null
  day: string
  acceptedToday: number
}

export interface ObjectBody {
  body: ReadableStream<Uint8Array>
  size: number
  text(): Promise<string>
}

export interface Bucket {
  get(key: string): Promise<ObjectBody | null>
  put(key: string, value: string | ArrayBuffer): Promise<unknown>
}

export interface Storage {
  get<T>(key: string): Promise<T | undefined>
  put(key: string, value: unknown): Promise<void>
  setAlarm(time: number): Promise<void>
  deleteAlarm(): Promise<void>
  transaction<T>(
    operation: (transaction: Pick<Storage, "put" | "setAlarm">) => Promise<T>,
  ): Promise<T>
}

export interface ContainerTransport {
  fetch(
    name: string,
    path: string,
    token: string,
    init?: RequestInit,
  ): Promise<Response>
  stop(name: string, token: string): Promise<void>
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  })

export const publicJob = (job: StoredJob): Job => ({
  request_id: job.request_id,
  status: job.status,
  created_at: job.created_at,
  updated_at: job.updated_at,
  ...(job.message ? { message: job.message } : {}),
  ...(job.result_file_path ? { result_file_path: job.result_file_path } : {}),
})

export const inputKey = (id: string) => `jobs/${id}/input.json`
export const statusKey = (id: string) => `jobs/${id}/status.json`
export const resultKey = (id: string) => `jobs/${id}/result.circuit.json`
export const resultPath = (id: string) =>
  `return-current/${id}/result.circuit.json`

export const readLimited = async (
  body: ReadableStream<Uint8Array> | null,
  limit: number,
) => {
  if (!body) throw new HttpError(400, "Missing request body")
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit)
        throw new HttpError(413, `Payload exceeds ${limit} bytes`)
      chunks.push(value)
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes.buffer
}

export const validateRequest = (value: unknown): SimulationRequest => {
  const parsed = requestSchema.safeParse(value)
  if (!parsed.success) throw new HttpError(400, parsed.error.message)
  const request = parsed.data
  const board = request.circuit_json.find(
    (element) => element.type === "pcb_board",
  )
  if (
    !board ||
    typeof board.width !== "number" ||
    typeof board.height !== "number" ||
    !Number.isFinite(board.width) ||
    !Number.isFinite(board.height) ||
    board.width <= 0 ||
    board.height <= 0
  ) {
    throw new HttpError(
      400,
      "A PCB board with finite positive dimensions is required",
    )
  }
  let width = board.width
  let height = board.height
  const thickness = board.thickness ?? 0.8
  if (
    typeof thickness !== "number" ||
    !Number.isFinite(thickness) ||
    thickness <= 0 ||
    thickness > 5
  ) {
    throw new HttpError(400, "PCB thickness must be positive and at most 5 mm")
  }
  if (Array.isArray(board.outline) && board.outline.length) {
    const points = board.outline as { x?: unknown; y?: unknown }[]
    if (
      points.length < 3 ||
      points.length > 2000 ||
      points.some(
        (point) =>
          !point ||
          typeof point.x !== "number" ||
          typeof point.y !== "number" ||
          !Number.isFinite(point.x) ||
          !Number.isFinite(point.y),
      )
    ) {
      throw new HttpError(
        400,
        "PCB outline vertices must have finite coordinates",
      )
    }
    const bounds = points.reduce(
      (bounds, point) => ({
        minX: Math.min(bounds.minX, point.x as number),
        maxX: Math.max(bounds.maxX, point.x as number),
        minY: Math.min(bounds.minY, point.y as number),
        maxY: Math.max(bounds.maxY, point.y as number),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    )
    width = bounds.maxX - bounds.minX
    height = bounds.maxY - bounds.minY
    if (width <= 0 || height <= 0)
      throw new HttpError(400, "PCB outline must have positive extent")
  }
  if (
    board.width * board.height > 400 ||
    Math.max(board.width, board.height) > 100 ||
    width * height > 400 ||
    Math.max(width, height) > 100
  ) {
    throw new HttpError(
      400,
      "This preview service accepts PCB crops up to 400 mm² and 100 mm per side",
    )
  }
  if (
    request.cell_size < 0.005 ||
    Math.ceil(width / request.cell_size) *
      Math.ceil(height / request.cell_size) >
      1_000_000
  ) {
    throw new HttpError(
      400,
      "Sampling is limited to one million cells with pitch at least 0.005 mm",
    )
  }
  if (
    request.mesh_size < 0.25 ||
    request.mesh_size > 4 ||
    request.air_padding > 5
  ) {
    throw new HttpError(
      400,
      "Mesh size must be 0.25–4 mm and air padding at most 5 mm",
    )
  }
  return request
}
