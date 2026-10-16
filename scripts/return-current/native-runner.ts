import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { SimulationRunner } from "./protocol"

/** The dev transport is a stand-in for the CLI; every production result here
 * comes from a fresh Palace solve, using the installed simulator package. */
export const runNativeSimulation: SimulationRunner = async (
  request,
  jobDirectory,
) => {
  const { parseReturnCurrentCircuitJson, selectReturnCurrentExperiment } =
    await import("simulate-return-current")
  // Variable imports also work with this repository's legacy TS module resolver.
  const palaceEntry = "simulate-return-current/palace"
  const circuitJsonEntry = "simulate-return-current/circuit-json"
  const { runPalaceSimulation } = await import(palaceEntry)
  const { exportReturnCurrentCircuitJson } = await import(circuitJsonEntry)

  const input = parseReturnCurrentCircuitJson(request.circuit_json)
  const selected = selectReturnCurrentExperiment({
    circuitJson: input,
    experimentId: request.experiment_id,
  })
  const run = await runPalaceSimulation({
    circuitJson: selected.solverCircuitJson,
    excitations: selected.excitations,
    frequencyHz: request.frequency_hz,
    copperModel: request.copper_model,
    sampleLayer: request.sample_layer,
    cellSize: request.cell_size,
    meshSize: request.mesh_size,
    order: request.order,
    airPadding: request.air_padding,
    processes: request.processes,
    imageSize: 600,
    outputDirectory: join(jobDirectory, "solver"),
  })
  const resultId = `simulation_pcb_return_current_result_${request.request_id}`
  const exported: Record<string, unknown>[] = exportReturnCurrentCircuitJson({
    circuitJson: input,
    experimentId: request.experiment_id,
    resultId,
    simulation: {
      model: JSON.parse(
        await readFile(join(run.outputDirectory, "model.json"), "utf8"),
      ),
      reference: JSON.parse(await readFile(run.referencePath, "utf8")),
    },
  })

  // Parsing may normalize units or drop unrelated PCB metadata. Keep the exact
  // browser PCB and replace only this experiment/frequency's result family.
  const replacedIds = new Set(
    request.circuit_json
      .filter(
        (element) =>
          element.type === "simulation_pcb_return_current_result" &&
          element.simulation_experiment_id === request.experiment_id &&
          element.frequency_hz === request.frequency_hz,
      )
      .map((element) => element.simulation_pcb_return_current_result_id),
  )
  return [
    ...request.circuit_json.filter(
      (element) =>
        !replacedIds.has(element.simulation_pcb_return_current_result_id),
    ),
    ...exported.filter(
      (element) => element.simulation_pcb_return_current_result_id === resultId,
    ),
  ]
}
