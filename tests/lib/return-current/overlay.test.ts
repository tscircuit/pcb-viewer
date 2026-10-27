import { expect, test } from "bun:test"
import { gzipSync } from "node:zlib"
import type {
  AnyCircuitElement,
  SimulationPcbReturnCurrentField,
  SimulationReturnCurrentGridJson,
} from "circuit-json"
import { type Matrix, applyToPoint } from "transformation-matrix"
import {
  getReturnCurrentHeatmapMatrix,
  getReturnCurrentVectorAt,
  loadReturnCurrentFields,
} from "../../../src/lib/return-current/overlay"

const realGrid: SimulationReturnCurrentGridJson = {
  field_type: "real",
  sheet_current_x: [0, null, 3, -3],
  sheet_current_y: [0, null, 4, 4],
}

const makeField = (
  grid: unknown = realGrid,
  overrides: Partial<SimulationPcbReturnCurrentField> = {},
): SimulationPcbReturnCurrentField => ({
  type: "simulation_pcb_return_current_field",
  simulation_pcb_return_current_field_id: "field_0",
  simulation_pcb_return_current_result_id: "result_0",
  source_net_id: "ground",
  layer: "bottom",
  field_type: "real",
  min_x: -1,
  min_y: -2,
  columns: 2,
  rows: 2,
  cell_width: 0.5,
  cell_height: 0.25,
  copper_thickness: 0.5,
  data_format: "simulation_return_current_grid_json_v1",
  field_asset: {
    project_relative_path: "fields/field_0.json",
    mimetype: "application/json",
    url: `data:application/json,${encodeURIComponent(JSON.stringify(grid))}`,
  },
  ...overrides,
})

test("loads only the selected result/layer and keeps masked cells distinct from zero", async () => {
  const field = makeField()
  const elements: AnyCircuitElement[] = [
    field,
    makeField(realGrid, {
      simulation_pcb_return_current_field_id: "other_result",
      simulation_pcb_return_current_result_id: "result_1",
      columns: 0,
    }),
    makeField(realGrid, {
      simulation_pcb_return_current_field_id: "other_layer",
      layer: "top",
      field_asset: {
        project_relative_path: "unloaded.json",
        mimetype: "application/json",
        url: "https://example.com/unloaded.json",
      },
    }),
  ]
  const original = JSON.stringify(elements)

  const loaded = await loadReturnCurrentFields(elements, "result_0", "bottom")

  expect(loaded).toEqual([
    {
      field,
      grid: realGrid,
      maximumDensity: 10,
      conductorCells: 3,
      maskedCells: 1,
    },
  ])
  expect(JSON.stringify(elements)).toBe(original)
  expect(getReturnCurrentVectorAt(loaded[0].grid, 0)).toEqual({
    x: 0,
    y: 0,
    magnitude: 0,
  })
  expect(getReturnCurrentVectorAt(loaded[0].grid, 1)).toBeNull()
  expect(getReturnCurrentVectorAt(loaded[0].grid, 3)).toEqual({
    x: -3,
    y: 4,
    magnitude: 5,
  })
  expect(await loadReturnCurrentFields(elements, "missing", "bottom")).toEqual(
    [],
  )
})

test("decodes gzip complex fields without replacing nulls or phase-zero vectors", async () => {
  const grid: SimulationReturnCurrentGridJson = {
    field_type: "complex_phasor",
    sheet_current_x_real: [3, null, 0, 0],
    sheet_current_x_imag: [4, null, 0, 0],
    sheet_current_y_real: [0, null, 0, 0],
    sheet_current_y_imag: [12, null, 5, 0],
  }
  const field = makeField(grid, {
    field_type: "complex_phasor",
    field_asset: {
      project_relative_path: "fields/field_0.json.gz",
      mimetype: "application/gzip",
      url: `data:application/gzip;base64,${gzipSync(JSON.stringify(grid)).toString("base64")}`,
    },
  })

  const [loaded] = await loadReturnCurrentFields([field], "result_0", "bottom")

  expect(loaded.grid).toEqual(grid)
  expect(loaded.maximumDensity).toBe(26)
  expect(loaded.conductorCells).toBe(3)
  expect(loaded.maskedCells).toBe(1)
  expect(getReturnCurrentVectorAt(loaded.grid, 0)).toEqual({
    x: 3,
    y: 0,
    magnitude: 13,
  })
  expect(getReturnCurrentVectorAt(loaded.grid, 1)).toBeNull()
  expect(getReturnCurrentVectorAt(loaded.grid, 2)).toEqual({
    x: 0,
    y: 0,
    magnitude: 5,
  })
  expect(getReturnCurrentVectorAt(loaded.grid, 3)).toEqual({
    x: 0,
    y: 0,
    magnitude: 0,
  })
})

test("loads base64 JSON and handles an entirely masked field", async () => {
  const grid: SimulationReturnCurrentGridJson = {
    field_type: "real",
    sheet_current_x: [null, null, null, null],
    sheet_current_y: [null, null, null, null],
  }
  const field = makeField(grid, {
    field_asset: {
      project_relative_path: "fields/empty.json",
      mimetype: "application/json",
      url: `data:application/json;base64,${btoa(JSON.stringify(grid))}`,
    },
  })

  const [loaded] = await loadReturnCurrentFields([field], "result_0", "bottom")

  expect(loaded.grid).toEqual(grid)
  expect(loaded.maximumDensity).toBe(0)
  expect(loaded.conductorCells).toBe(0)
  expect(loaded.maskedCells).toBe(4)
})

test("rejects external assets and invalid embedded payloads", async () => {
  for (const url of [
    "https://example.com/field.json",
    "data:application/json;base64,%%%",
    "data:application/json,not-json",
  ]) {
    const field = makeField(realGrid, {
      field_asset: {
        project_relative_path: "fields/invalid.json",
        mimetype: "application/json",
        url,
      },
    })
    await expect(
      loadReturnCurrentFields([field], "result_0", "bottom"),
    ).rejects.toThrow()
  }
  const field = makeField(realGrid, {
    field_asset: {
      project_relative_path: "fields/invalid.json.gz",
      mimetype: "application/gzip",
      url: `data:application/gzip;base64,${btoa("not gzip")}`,
    },
  })
  await expect(
    loadReturnCurrentFields([field], "result_0", "bottom"),
  ).rejects.toThrow()
})

test("validates selected field dimensions, MIME types, channels and shared conductor masks", async () => {
  const invalidFields = [
    makeField(realGrid, { columns: 0 }),
    makeField(realGrid, { copper_thickness: 0 }),
    makeField(realGrid, {
      field_asset: {
        project_relative_path: "fields/mismatch.json",
        mimetype: "application/gzip",
        url: `data:application/json,${encodeURIComponent(JSON.stringify(realGrid))}`,
      },
    }),
    makeField({ ...realGrid, sheet_current_y: [0, 1, 4, 4] }),
    makeField({ ...realGrid, sheet_current_y: [0, null, 4] }),
    makeField(
      {
        field_type: "complex_phasor",
        sheet_current_x_real: [0, null, 3, 0],
        sheet_current_x_imag: [0, null, 4, 0],
        sheet_current_y_real: [0, null, 0, 0],
        sheet_current_y_imag: [0, 1, 0, 0],
      },
      { field_type: "complex_phasor" },
    ),
    makeField(realGrid, { field_type: "complex_phasor" }),
  ]
  for (const field of invalidFields) {
    await expect(
      loadReturnCurrentFields([field], "result_0", "bottom"),
    ).rejects.toThrow()
  }
})

test("heatmap top-left and bottom-right follow the existing y-flipped pan/zoom transform", () => {
  const matrix = getReturnCurrentHeatmapMatrix(
    { min_x: -2, min_y: 3, max_x: 4, max_y: 8 },
    { a: 2, b: 0, c: 0, d: -2, e: 100, f: 200 },
  )

  expect(applyToPoint(matrix, { x: 0, y: 0 })).toEqual({ x: 96, y: 184 })
  expect(applyToPoint(matrix, { x: 1, y: 1 })).toEqual({ x: 108, y: 194 })
  expect(applyToPoint(matrix, { x: 0.5, y: 0.5 })).toEqual({ x: 102, y: 189 })
})

test("heatmap corners remain aligned through a rotated PCB view", () => {
  const transform: Matrix = { a: 0, b: 3, c: 3, d: 0, e: -20, f: 50 }
  const matrix = getReturnCurrentHeatmapMatrix(
    { min_x: -2, min_y: 3, max_x: 4, max_y: 8 },
    transform,
  )

  expect(applyToPoint(matrix, { x: 0, y: 0 })).toEqual({ x: 4, y: 44 })
  expect(applyToPoint(matrix, { x: 1, y: 0 })).toEqual({ x: 4, y: 62 })
  expect(applyToPoint(matrix, { x: 0, y: 1 })).toEqual({ x: -11, y: 44 })
  expect(applyToPoint(matrix, { x: 1, y: 1 })).toEqual({ x: -11, y: 62 })
})
