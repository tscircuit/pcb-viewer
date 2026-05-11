import type { AnyCircuitElement } from "circuit-json"
import type React from "react"
import { useMemo, useState } from "react"
import { PCBViewer } from "../../PCBViewer"

const sampleCircuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    width: 18,
    height: 12,
    center: { x: 0, y: 0 },
    material: "fr4",
    num_layers: 2,
    thickness: 1.6,
  } as AnyCircuitElement,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_0",
    pcb_component_id: "pcb_component_0",
    pcb_port_id: "pcb_port_0",
    shape: "rect",
    x: -3,
    y: 0,
    width: 1.4,
    height: 2,
    layer: "top",
  } as AnyCircuitElement,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_1",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "pcb_port_1",
    shape: "rect",
    x: 3,
    y: 0,
    width: 1.4,
    height: 2,
    layer: "top",
  } as AnyCircuitElement,
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_0",
    route: [
      {
        route_type: "wire",
        x: -3,
        y: 0,
        width: 0.25,
        layer: "top",
        start_pcb_port_id: "pcb_port_0",
      },
      { route_type: "wire", x: 3, y: 0, width: 0.25, layer: "top" },
    ],
    source_trace_id: "source_trace_0",
  } as AnyCircuitElement,
]

const normalizeCircuitJson = (parsedJson: unknown): AnyCircuitElement[] => {
  if (Array.isArray(parsedJson)) return parsedJson as AnyCircuitElement[]

  if (parsedJson && typeof parsedJson === "object") {
    const possibleCircuitJson = parsedJson as {
      circuitJson?: unknown
      circuit_json?: unknown
      elements?: unknown
    }

    if (Array.isArray(possibleCircuitJson.circuitJson)) {
      return possibleCircuitJson.circuitJson as AnyCircuitElement[]
    }

    if (Array.isArray(possibleCircuitJson.circuit_json)) {
      return possibleCircuitJson.circuit_json as AnyCircuitElement[]
    }

    if (Array.isArray(possibleCircuitJson.elements)) {
      return possibleCircuitJson.elements as AnyCircuitElement[]
    }
  }

  throw new Error(
    "Expected a circuit-json array, or an object with circuitJson, circuit_json, or elements.",
  )
}

export const CircuitJsonPastePreview: React.FC = () => {
  const sampleText = useMemo(
    () => JSON.stringify(sampleCircuitJson, null, 2),
    [],
  )
  const [inputText, setInputText] = useState(sampleText)
  const [circuitJson, setCircuitJson] =
    useState<AnyCircuitElement[]>(sampleCircuitJson)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLoadPreview = () => {
    try {
      const parsedJson = JSON.parse(inputText)
      const nextCircuitJson = normalizeCircuitJson(parsedJson)

      setCircuitJson(nextCircuitJson)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111827",
        color: "#f9fafb",
        padding: 24,
        boxSizing: "border-box",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Circuit JSON Paste Preview</h1>
        <p style={{ color: "#d1d5db", lineHeight: 1.5 }}>
          Paste a circuit-json array below, then click Load Preview to render it
          in the PCB viewer. Objects with a <code>circuitJson</code>,{" "}
          <code>circuit_json</code>, or <code>elements</code> array are also
          accepted.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <textarea
              aria-label="Circuit JSON input"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              spellCheck={false}
              style={{
                width: "100%",
                minHeight: 620,
                boxSizing: "border-box",
                resize: "vertical",
                border: "1px solid #374151",
                borderRadius: 8,
                padding: 12,
                background: "#030712",
                color: "#e5e7eb",
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={handleLoadPreview}
                style={{
                  border: 0,
                  borderRadius: 8,
                  padding: "10px 14px",
                  background: "#2563eb",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Load Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputText(sampleText)
                  setCircuitJson(sampleCircuitJson)
                  setErrorMessage(null)
                }}
                style={{
                  border: "1px solid #4b5563",
                  borderRadius: 8,
                  padding: "10px 14px",
                  background: "#1f2937",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Reset Sample
              </button>
            </div>

            {errorMessage && (
              <div
                role="alert"
                style={{
                  marginTop: 12,
                  border: "1px solid #f87171",
                  borderRadius: 8,
                  padding: 12,
                  background: "#450a0a",
                  color: "#fecaca",
                }}
              >
                {errorMessage}
              </div>
            )}
          </div>

          <div
            style={{
              overflow: "hidden",
              border: "1px solid #374151",
              borderRadius: 10,
              background: "black",
            }}
          >
            <PCBViewer circuitJson={circuitJson} height={680} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CircuitJsonPastePreview
