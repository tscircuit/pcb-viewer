import type { Primitive } from "./types"
import { getPrimitiveBoundingBox } from "./util/get-primitive-bounding-box"

type PrimitiveGridCellKey = `${number}:${number}`

export type PrimitiveSpatialIndex = {
  cellSize: number
  globalPrimitives: Primitive[]
  maxTraceWidth: number
  primitiveIndexByPrimitive: Map<Primitive, number>
  primitives: Primitive[]
  primitivesByCell: Map<PrimitiveGridCellKey, Primitive[]>
}

const MAX_CELLS_PER_PRIMITIVE = 64
const MAX_QUERY_CELLS = 256
const TARGET_PRIMITIVES_PER_CELL = 8

function getCellKey({
  cellX,
  cellY,
}: {
  cellX: number
  cellY: number
}): PrimitiveGridCellKey {
  return `${cellX}:${cellY}`
}

function getCellSize(primitives: Primitive[]): number {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const primitive of primitives) {
    const bounds = getPrimitiveBoundingBox(primitive)
    if (!bounds) continue
    minX = Math.min(minX, bounds.minX)
    minY = Math.min(minY, bounds.minY)
    maxX = Math.max(maxX, bounds.maxX)
    maxY = Math.max(maxY, bounds.maxY)
  }

  if (!Number.isFinite(minX)) return 1

  const longestSide = Math.max(maxX - minX, maxY - minY)
  const targetCellsPerSide = Math.sqrt(
    Math.max(1, primitives.length / TARGET_PRIMITIVES_PER_CELL),
  )
  return Math.max(0.5, Math.min(20, longestSide / targetCellsPerSide))
}

export function createPrimitiveSpatialIndex(
  primitives: Primitive[],
): PrimitiveSpatialIndex {
  const cellSize = getCellSize(primitives)
  const primitivesByCell = new Map<PrimitiveGridCellKey, Primitive[]>()
  const primitiveIndexByPrimitive = new Map<Primitive, number>()
  const globalPrimitives: Primitive[] = []
  let maxTraceWidth = 0

  for (const [primitiveIndex, primitive] of primitives.entries()) {
    primitiveIndexByPrimitive.set(primitive, primitiveIndex)
    if (
      primitive.pcb_drawing_type === "line" &&
      primitive._element?.type === "pcb_trace"
    ) {
      maxTraceWidth = Math.max(maxTraceWidth, primitive.width)
    }

    const bounds = getPrimitiveBoundingBox(primitive)
    if (!bounds) {
      globalPrimitives.push(primitive)
      continue
    }

    const minCellX = Math.floor(bounds.minX / cellSize)
    const maxCellX = Math.floor(bounds.maxX / cellSize)
    const minCellY = Math.floor(bounds.minY / cellSize)
    const maxCellY = Math.floor(bounds.maxY / cellSize)
    const cellCount = (maxCellX - minCellX + 1) * (maxCellY - minCellY + 1)

    if (cellCount > MAX_CELLS_PER_PRIMITIVE) {
      globalPrimitives.push(primitive)
      continue
    }

    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
        const cellKey = getCellKey({ cellX, cellY })
        const cellPrimitives = primitivesByCell.get(cellKey) ?? []
        cellPrimitives.push(primitive)
        primitivesByCell.set(cellKey, cellPrimitives)
      }
    }
  }

  return {
    cellSize,
    globalPrimitives,
    maxTraceWidth,
    primitiveIndexByPrimitive,
    primitives,
    primitivesByCell,
  }
}

export function getPrimitivesNearPoint({
  point,
  realToScreenScale,
  spatialIndex,
}: {
  point: { x: number; y: number }
  realToScreenScale: number
  spatialIndex: PrimitiveSpatialIndex
}): Primitive[] {
  const scale = Math.max(Math.abs(realToScreenScale), Number.EPSILON)
  const queryRadius = Math.max(spatialIndex.maxTraceWidth * 25, 2) / scale
  const minCellX = Math.floor((point.x - queryRadius) / spatialIndex.cellSize)
  const maxCellX = Math.floor((point.x + queryRadius) / spatialIndex.cellSize)
  const minCellY = Math.floor((point.y - queryRadius) / spatialIndex.cellSize)
  const maxCellY = Math.floor((point.y + queryRadius) / spatialIndex.cellSize)
  const queryCellCount = (maxCellX - minCellX + 1) * (maxCellY - minCellY + 1)

  if (queryCellCount > MAX_QUERY_CELLS) return spatialIndex.primitives

  const nearbyPrimitives = new Set<Primitive>(spatialIndex.globalPrimitives)
  for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
    for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
      const cellKey = getCellKey({ cellX, cellY })
      const cellPrimitives = spatialIndex.primitivesByCell.get(cellKey)
      if (!cellPrimitives) continue
      for (const primitive of cellPrimitives) {
        nearbyPrimitives.add(primitive)
      }
    }
  }

  return [...nearbyPrimitives].sort(
    (firstPrimitive, secondPrimitive) =>
      (spatialIndex.primitiveIndexByPrimitive.get(firstPrimitive) ??
        Number.MAX_SAFE_INTEGER) -
      (spatialIndex.primitiveIndexByPrimitive.get(secondPrimitive) ??
        Number.MAX_SAFE_INTEGER),
  )
}
