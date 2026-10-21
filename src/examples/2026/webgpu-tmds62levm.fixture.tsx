import { useEffect, useState } from "react"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../PCBViewer"

type Renderer = "webgpu" | "canvas"

const circuitJsonUrl = "/fixtures/tmds62levm-full-board.circuit.json.gz"

async function loadCircuitJson({ signal }: { signal: AbortSignal }) {
  const response = await fetch(circuitJsonUrl, { signal })
  if (!response.ok) {
    throw new Error(`Unable to load TMDS62LEVM (${response.status})`)
  }

  const compressedArrayBuffer = await response.arrayBuffer()
  const compressedBytes = new Uint8Array(compressedArrayBuffer)
  const isGzip = compressedBytes[0] === 0x1f && compressedBytes[1] === 0x8b

  if (!isGzip) {
    const circuitJson: AnyCircuitElement[] = JSON.parse(
      new TextDecoder().decode(compressedBytes),
    )
    return circuitJson
  }

  const decompressedStream = new Blob([compressedArrayBuffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  const circuitJson: AnyCircuitElement[] = await new Response(
    decompressedStream,
  ).json()
  return circuitJson
}

function getRenderer(value: string): Renderer {
  if (value === "canvas") return "canvas"
  return "webgpu"
}

function ViewerContent({
  circuitJson,
  errorMessage,
  renderer,
}: {
  circuitJson: AnyCircuitElement[] | null
  errorMessage: string | null
  renderer: Renderer
}) {
  if (errorMessage) return <p role="alert">{errorMessage}</p>
  if (!circuitJson) return <p>Loading TMDS62LEVM…</p>
  return <PCBViewer circuitJson={circuitJson} renderer={renderer} />
}

export default function WebGpuTmds62levm() {
  const [renderer, setRenderer] = useState<Renderer>("webgpu")
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[] | null>(
    null,
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const abortController = new AbortController()

    loadCircuitJson({ signal: abortController.signal })
      .then(setCircuitJson)
      .catch((error: unknown) => {
        if (abortController.signal.aborted) return
        setErrorMessage(error instanceof Error ? error.message : String(error))
      })

    return () => abortController.abort()
  }, [])

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <label style={{ padding: 8 }}>
        TMDS62LEVM renderer:{" "}
        <select
          value={renderer}
          onChange={(event) => setRenderer(getRenderer(event.target.value))}
        >
          <option value="webgpu">WebGPU</option>
          <option value="canvas">Canvas</option>
        </select>
      </label>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ViewerContent
          circuitJson={circuitJson}
          errorMessage={errorMessage}
          renderer={renderer}
        />
      </div>
    </div>
  )
}
