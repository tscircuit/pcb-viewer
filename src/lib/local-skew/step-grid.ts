import type { TraceStep } from "./walk-trace"

/** A uniform grid of steps, for finding the steps near another step without checking them all. */
export type StepGrid = {
  cellSize: number
  /** Indices into `steps`, keyed by `"column,row"`. */
  cells: Map<string, number[]>
  steps: TraceStep[]
}

/** Cells smaller than this, in mm, only add bookkeeping. */
const MIN_CELL_SIZE = 0.1

/** Places each step in every cell its bounds, grown by `reach`, touch. */
export function buildStepGrid({
  steps,
  reach,
}: {
  steps: TraceStep[]
  /** How far from a step, in mm, a query should still find it. */
  reach: number
}): StepGrid {
  let totalLength = 0
  for (const step of steps) totalLength += step.length
  const cellSize = Math.max(
    MIN_CELL_SIZE,
    reach,
    totalLength / Math.max(1, steps.length),
  )

  const cells = new Map<string, number[]>()
  steps.forEach((step, index) => {
    const range = cellRange({ step, cellSize, margin: reach })
    for (let column = range.minColumn; column <= range.maxColumn; column++) {
      for (let row = range.minRow; row <= range.maxRow; row++) {
        const key = `${column},${row}`
        const cell = cells.get(key)
        if (cell) {
          cell.push(index)
          continue
        }
        cells.set(key, [index])
      }
    }
  })
  return { cellSize, cells, steps }
}

/** Steps whose grown bounds share a cell with `step`, in their original order. */
export function stepsNear({
  grid,
  step,
}: {
  grid: StepGrid
  step: TraceStep
}): TraceStep[] {
  const range = cellRange({ step, cellSize: grid.cellSize, margin: 0 })
  const found = new Set<number>()
  for (let column = range.minColumn; column <= range.maxColumn; column++) {
    for (let row = range.minRow; row <= range.maxRow; row++) {
      for (const index of grid.cells.get(`${column},${row}`) ?? []) {
        found.add(index)
      }
    }
  }
  return [...found].sort((a, b) => a - b).map((index) => grid.steps[index])
}

/** The block of grid cells covered by a step's bounds grown by `margin`. */
type CellRange = {
  minColumn: number
  maxColumn: number
  minRow: number
  maxRow: number
}

/** The cells a step covers, grown by `margin` mm on every side. */
function cellRange({
  step,
  cellSize,
  margin,
}: {
  step: TraceStep
  cellSize: number
  margin: number
}): CellRange {
  return {
    minColumn: Math.floor(
      (Math.min(step.start.x, step.end.x) - margin) / cellSize,
    ),
    maxColumn: Math.floor(
      (Math.max(step.start.x, step.end.x) + margin) / cellSize,
    ),
    minRow: Math.floor(
      (Math.min(step.start.y, step.end.y) - margin) / cellSize,
    ),
    maxRow: Math.floor(
      (Math.max(step.start.y, step.end.y) + margin) / cellSize,
    ),
  }
}
