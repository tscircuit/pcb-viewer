import { z } from "zod"

export const requestIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/)

export const simulationRequestSchema = z
  .object({
    event_type: z.literal("REQUEST_RETURN_CURRENT_SIMULATION"),
    request_id: requestIdSchema,
    circuit_json: z.array(z.record(z.unknown())).min(1),
    experiment_id: z.string().min(1).max(256),
    frequency_hz: z.number().finite().positive(),
    copper_model: z.literal("surface_impedance_copper"),
    sample_layer: z
      .enum([
        "top",
        "inner1",
        "inner2",
        "inner3",
        "inner4",
        "inner5",
        "inner6",
        "inner7",
        "inner8",
        "bottom",
      ])
      .default("bottom"),
    cell_size: z.number().finite().positive().default(0.1),
    mesh_size: z.number().finite().positive().default(2),
    order: z.union([z.literal(1), z.literal(2)]).default(1),
    air_padding: z.number().finite().positive().default(2),
    processes: z.number().int().min(1).max(4).default(1),
  })
  .strict()

export type SimulationRequest = z.infer<typeof simulationRequestSchema>
export type JobStatus = "queued" | "running" | "completed" | "failed"
export type Job = {
  request_id: string
  status: JobStatus
  created_at: string
  updated_at: string
  result_file_path?: string
  message?: string
}
export type StatusEvent = Job & {
  event_type: "RETURN_CURRENT_SIMULATION_STATUS"
  event_id: string
  sequence: number
}

export type SimulationRunner = (
  request: SimulationRequest,
  jobDirectory: string,
) => Promise<unknown[]>
