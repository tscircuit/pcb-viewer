import type { AnyCircuitElement } from "circuit-json"
import { Profiler } from "react"
import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../src"

type SitaraInteractionStats = {
  elementCount: number
  firstPaintMs: number | null
  frames: number
  interactionCommitCount: number
  interactionRenderMs: number
  maxInteractionRenderMs: number
}

declare global {
  interface Window {
    sitaraInteractionTest: {
      mount: () => Promise<void>
      stats: SitaraInteractionStats
    }
  }
}

const circuitJsonUrl = "/fixtures/tmds62levm-full-board.circuit.json.gz"
const root = createRoot(document.getElementById("root")!)
const stats: SitaraInteractionStats = {
  elementCount: 0,
  firstPaintMs: null,
  frames: 0,
  interactionCommitCount: 0,
  interactionRenderMs: 0,
  maxInteractionRenderMs: 0,
}

const OriginalWorker = window.Worker
window.Worker = class extends OriginalWorker {
  constructor(...args: ConstructorParameters<typeof Worker>) {
    super(...args)
    this.addEventListener("message", (event) => {
      if (event.data?.type === "rendered") stats.frames++
    })
  }
}

async function loadCircuitJson(): Promise<AnyCircuitElement[]> {
  const response = await fetch(circuitJsonUrl)
  if (!response.ok) {
    throw new Error(`Unable to load TMDS62LEVM (${response.status})`)
  }

  const compressedArrayBuffer = await response.arrayBuffer()
  const compressedBytes = new Uint8Array(compressedArrayBuffer)
  const isGzip = compressedBytes[0] === 0x1f && compressedBytes[1] === 0x8b
  if (!isGzip) {
    return JSON.parse(new TextDecoder().decode(compressedBytes))
  }

  const decompressedStream = new Blob([compressedArrayBuffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))

  return new Response(decompressedStream).json()
}

async function mount() {
  const circuitJson = await loadCircuitJson()
  stats.elementCount = circuitJson.length
  const mountStartedAt = performance.now()

  root.render(
    <Profiler
      id="sitara-viewer"
      onRender={(_id, phase, actualDuration) => {
        if (phase !== "update") return
        stats.interactionCommitCount++
        stats.interactionRenderMs += actualDuration
        stats.maxInteractionRenderMs = Math.max(
          stats.maxInteractionRenderMs,
          actualDuration,
        )
      }}
    >
      <PCBViewer
        circuitJson={circuitJson}
        renderer="webgpu"
        allowEditing={false}
        height={window.innerHeight}
        onRenderComplete={() => {
          stats.firstPaintMs ??= performance.now() - mountStartedAt
        }}
      />
    </Profiler>,
  )
}

window.sitaraInteractionTest = { mount, stats }
