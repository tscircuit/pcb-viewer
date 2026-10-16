import {
  type AnyCircuitElement,
  type SimulationPcbReturnCurrentField,
  type SimulationReturnCurrentGridJson,
  getSimulationReturnCurrentGridJsonSchema,
  simulation_pcb_return_current_field,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"

export type LoadedReturnCurrentField = {
  field: SimulationPcbReturnCurrentField
  grid: SimulationReturnCurrentGridJson
  maximumDensity: number
  conductorCells: number
  maskedCells: number
}

/** Complex arrows show the real part at the excitation's positive-current peak. */
export const getReturnCurrentVectorAt = (
  grid: SimulationReturnCurrentGridJson,
  index: number,
): { x: number; y: number; magnitude: number } | null => {
  if (grid.field_type === "real") {
    const x = grid.sheet_current_x[index]
    const y = grid.sheet_current_y[index]
    if (x == null || y == null) return null
    return { x, y, magnitude: Math.hypot(x, y) }
  }

  const xr = grid.sheet_current_x_real[index]
  const xi = grid.sheet_current_x_imag[index]
  const yr = grid.sheet_current_y_real[index]
  const yi = grid.sheet_current_y_imag[index]
  if (xr == null || xi == null || yr == null || yi == null) return null
  return { x: xr, y: yr, magnitude: Math.hypot(xr, xi, yr, yi) }
}

const decodeEmbeddedField = async (
  field: SimulationPcbReturnCurrentField,
): Promise<SimulationReturnCurrentGridJson> => {
  const match = /^data:([^,]*),(.*)$/s.exec(field.field_asset.url)
  if (!match) {
    throw new Error(
      `Return-current field '${field.simulation_pcb_return_current_field_id}' requires an embedded data URL`,
    )
  }

  let bytes = match[1].split(";").includes("base64")
    ? Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(match[2]))

  if (field.field_asset.mimetype === "application/gzip") {
    if (typeof DecompressionStream === "undefined") {
      throw new Error(
        "This browser cannot decompress gzip return-current fields",
      )
    }
    bytes = new Uint8Array(
      await new Response(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
      ).arrayBuffer(),
    )
  }

  return getSimulationReturnCurrentGridJsonSchema(field).parse(
    JSON.parse(new TextDecoder().decode(bytes)),
  )
}

/** Loads only embedded assets for the selected result and copper layer. */
export const loadReturnCurrentFields = async (
  circuitJson: AnyCircuitElement[],
  resultId: string,
  layer: string,
): Promise<LoadedReturnCurrentField[]> => {
  const fields = circuitJson
    .filter(
      (element) =>
        element.type === "simulation_pcb_return_current_field" &&
        element.simulation_pcb_return_current_result_id === resultId &&
        element.layer === layer,
    )
    .map((element) => simulation_pcb_return_current_field.parse(element))

  return Promise.all(
    fields.map(async (field) => {
      const grid = await decodeEmbeddedField(field)
      const cellCount = field.columns * field.rows
      let maximumDensity = 0
      let conductorCells = 0
      for (let index = 0; index < cellCount; index++) {
        const vector = getReturnCurrentVectorAt(grid, index)
        if (vector === null) continue
        conductorCells++
        maximumDensity = Math.max(
          maximumDensity,
          vector.magnitude / field.copper_thickness,
        )
      }

      return {
        field,
        grid,
        maximumDensity,
        conductorCells,
        maskedCells: cellCount - conductorCells,
      }
    }),
  )
}

/** Maps a normalized image's top-left corner to the field's maximum PCB y. */
export const getReturnCurrentHeatmapMatrix = (
  bounds: { min_x: number; min_y: number; max_x: number; max_y: number },
  transform: Matrix,
): Matrix => {
  const width = bounds.max_x - bounds.min_x
  const height = bounds.max_y - bounds.min_y
  return {
    a: transform.a * width,
    b: transform.b * width,
    c: -transform.c * height,
    d: -transform.d * height,
    e: transform.a * bounds.min_x + transform.c * bounds.max_y + transform.e,
    f: transform.b * bounds.min_x + transform.d * bounds.max_y + transform.f,
  }
}
