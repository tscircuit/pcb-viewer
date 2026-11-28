import { mkdtemp, rm } from "node:fs/promises"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { type ReactNode, isValidElement } from "react"
import { RootCircuit } from "tscircuit"
import { fetchAm3352Source } from "./fetch-am3352-source"
import { withDdrPhaseSkew } from "./with-ddr-phase-skew"

const output = process.argv[2]
if (!output || process.argv.length !== 3 || !output.endsWith(".json")) {
  throw new Error(
    "Usage: bun tests/fixtures/differential-pair-phase-skew/am3352-ddr-track-a/regenerate-board.ts <output.json>",
  )
}

// Keep the downloaded TSX under the viewer so it resolves the viewer's locked
// dependency versions. Always clean the source tree up, even if rendering fails.
const sourceDir = await mkdtemp(
  resolve(import.meta.dir, "../../../../node_modules/.am3352-source-"),
)
try {
  const { entry, assetUrls } = await fetchAm3352Source(sourceDir)
  const { default: getBoard } = (await import(pathToFileURL(entry).href)) as {
    default: () => unknown
  }
  const board = getBoard()
  if (
    !isValidElement<{ children?: ReactNode }>(board) ||
    board.type !== "board"
  ) {
    throw new Error("Expected the AM3352 TSX entry to return a <board>")
  }

  const root = new RootCircuit()
  root.add(withDdrPhaseSkew(board))
  await root.renderUntilSettled()
  const circuitJson = root.getCircuitJson()
  const traceCount = circuitJson.filter(
    (element) => element.type === "pcb_trace",
  ).length
  if (traceCount === 0) {
    throw new Error("The regenerated AM3352 fixture has no routed traces")
  }
  // The source directory is deleted below; keep CAD links usable after generation.
  // This fixture exercises the PCB viewer; omit unrelated schematic records.
  const pcbFixture = circuitJson.filter(
    (element) => !element.type.startsWith("schematic_"),
  )
  const json = JSON.stringify(pcbFixture, (_, property: unknown) =>
    typeof property === "string" ? (assetUrls[property] ?? property) : property,
  )
  await Bun.write(output, `${json}\n`)
  console.log(
    `Wrote ${output} (${pcbFixture.length} elements, ${traceCount} PCB traces)`,
  )
} finally {
  await rm(sourceDir, { recursive: true, force: true })
}
