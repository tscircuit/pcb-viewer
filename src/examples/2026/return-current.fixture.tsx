import { useEffect, useRef, useState } from "react"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "../../PCBViewer"
import {
  createReturnCurrentExperimentFromTrace,
  getReturnCurrentGroundCandidates,
  getReturnCurrentTraceTerminals,
} from "../../lib/return-current-experiment"
import { returnCurrentDemoBoard } from "../../assets/return-current-board"

type JobStatus = "idle" | "queued" | "running" | "completed" | "failed"
type Result = {
  circuitJson: AnyCircuitElement[]
  resultId: string
  pcbTraceId: string
  frequencyMHz: number
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "7px 8px",
  color: "#f1f5f9",
  background: "#142b33",
  border: "1px solid #48616b",
  borderRadius: 4,
}
const resumedRequestId =
  typeof window === "undefined"
    ? ""
    : (new URLSearchParams(window.location.search).get(
        "return_current_request_id",
      ) ?? "")

export default function ReturnCurrentSimulationDemo() {
  const [selectedTrace, setSelectedTrace] = useState("")
  const [frequency, setFrequency] = useState(400)
  const [current, setCurrent] = useState(5)
  const [sourceResistance, setSourceResistance] = useState(25)
  const [loadResistance, setLoadResistance] = useState(100)
  const [cellSize, setCellSize] = useState(0.01)
  const [meshSize, setMeshSize] = useState(0.5)
  const [order, setOrder] = useState(2)
  const [returnSource, setReturnSource] = useState("pcb_port_u2_gnd")
  const [returnSink, setReturnSink] = useState("pcb_port_u1_gnd")
  const [result, setResult] = useState<Result | null>(null)
  const [status, setStatus] = useState<JobStatus>(
    resumedRequestId ? "running" : "idle",
  )
  const [message, setMessage] = useState(
    "Right-click the signal trace to choose a connection.",
  )
  const [serverReady, setServerReady] = useState(false)
  const [serverMessage, setServerMessage] = useState(
    "Connecting to the local CLI event server…",
  )
  const [requestId, setRequestId] = useState(resumedRequestId)
  const [heatmap, setHeatmap] = useState(true)
  const [vectors, setVectors] = useState(true)
  const [opacity, setOpacity] = useState(0.65)
  const submitted = useRef<{ pcbTraceId: string; frequencyMHz: number } | null>(
    null,
  )
  const activeRequest = useRef(resumedRequestId)
  const groundCandidates = getReturnCurrentGroundCandidates(
    returnCurrentDemoBoard,
    "source_net_gnd",
  )
  const terminals = selectedTrace
    ? getReturnCurrentTraceTerminals(returnCurrentDemoBoard, selectedTrace)
    : null
  const busy = status === "queued" || status === "running"

  useEffect(() => {
    const url = new URL(window.location.href)
    if (requestId) url.searchParams.set("return_current_request_id", requestId)
    else url.searchParams.delete("return_current_request_id")
    window.history.replaceState(null, "", url)
  }, [requestId])

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const response = await fetch("/api/health")
        if (!response.ok)
          throw new Error(
            "Start the local CLI event server with bun run dev:cli",
          )
        const health = await response.json()
        if (!cancelled) {
          setServerReady(Boolean(health.available))
          setServerMessage(
            health.available
              ? "Local CLI event server connected · Palace ready"
              : health.message || "EM runtime unavailable",
          )
        }
      } catch (error) {
        if (!cancelled) {
          setServerReady(false)
          setServerMessage(
            error instanceof Error
              ? error.message
              : "CLI event server unavailable",
          )
        }
      }
    }
    void check()
    const timer = setInterval(check, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!requestId) return
    let cancelled = false
    let cursor = 0
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const response = await fetch(`/api/events/list?after=${cursor}`)
        if (!response.ok) throw new Error("Unable to poll the CLI event server")
        const body = await response.json()
        cursor = body.cursor ?? cursor
        const matching = body.event_list.filter(
          (event: { request_id: string }) => event.request_id === requestId,
        )
        let job = matching[matching.length - 1]
        if (!job) {
          const recovery = await fetch(
            `/api/jobs/${encodeURIComponent(requestId)}`,
          )
          if (recovery.status === 404)
            throw new Error(
              "This simulation request was not found on the local event server",
            )
          if (recovery.ok) job = (await recovery.json()).job
        }
        if (cancelled || activeRequest.current !== requestId) return
        if (job) {
          setStatus(job.status === "completed" ? "running" : job.status)
          setMessage(
            job.message ||
              (job.status === "running"
                ? "Running the EM field solver…"
                : job.status),
          )
          if (job.status === "completed") {
            const resultResponse = await fetch(
              `/api/files/get?file_path=${encodeURIComponent(job.result_file_path)}`,
            )
            if (!resultResponse.ok)
              throw new Error(
                "The simulation completed, but its result could not be loaded",
              )
            const circuitJson: AnyCircuitElement[] = JSON.parse(
              (await resultResponse.json()).file.content,
            )
            const simulation = [...circuitJson]
              .reverse()
              .find(
                (element) =>
                  element.type === "simulation_pcb_return_current_result",
              )
            if (
              !simulation ||
              simulation.type !== "simulation_pcb_return_current_result" ||
              typeof simulation.frequency_hz !== "number"
            )
              throw new Error(
                "No frequency-specific return-current result in the returned Circuit JSON",
              )
            const excitation = circuitJson.find(
              (element) =>
                element.type === "simulation_return_current_excitation" &&
                simulation.simulation_return_current_excitation_ids.includes(
                  element.simulation_return_current_excitation_id,
                ),
            )
            if (
              !excitation ||
              excitation.type !== "simulation_return_current_excitation"
            )
              throw new Error("The result has no selected trace excitation")
            if (
              submitted.current &&
              submitted.current.pcbTraceId !== excitation.pcb_trace_id
            )
              throw new Error(
                "The returned result belongs to a different trace",
              )
            if (cancelled || activeRequest.current !== requestId) return
            setResult({
              circuitJson,
              resultId: simulation.simulation_pcb_return_current_result_id,
              pcbTraceId: excitation.pcb_trace_id,
              frequencyMHz: simulation.frequency_hz / 1e6,
            })
            if (!submitted.current) {
              setSelectedTrace(excitation.pcb_trace_id)
              setFrequency(simulation.frequency_hz / 1e6)
              setCurrent(excitation.current * 1000)
              if (excitation.source_port) {
                if (excitation.source_port.reference_pcb_port_id)
                  setReturnSink(excitation.source_port.reference_pcb_port_id)
                setSourceResistance(excitation.source_port.resistance)
              }
              if (excitation.load_port) {
                if (excitation.load_port.reference_pcb_port_id)
                  setReturnSource(excitation.load_port.reference_pcb_port_id)
                setLoadResistance(excitation.load_port.resistance)
              }
              const field = circuitJson.find(
                (element) =>
                  element.type === "simulation_pcb_return_current_field" &&
                  element.simulation_pcb_return_current_result_id ===
                    simulation.simulation_pcb_return_current_result_id,
              )
              if (field?.type === "simulation_pcb_return_current_field")
                setCellSize(field.cell_width)
            }
            setStatus("completed")
            setMessage(
              "Real EM result loaded on the PCB. Pan or zoom to inspect the selected connection and GND return.",
            )
            return
          }
          if (job.status === "failed") return
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("failed")
          setMessage(
            error instanceof Error
              ? error.message
              : "Simulation request failed",
          )
        }
        return
      }
      if (!cancelled) timer = setTimeout(poll, 1000)
    }
    void poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [requestId])

  const chooseTrace = ({ pcbTraceId }: { pcbTraceId: string }) => {
    if (busy) return
    activeRequest.current = ""
    submitted.current = null
    setRequestId("")
    setSelectedTrace(pcbTraceId)
    setResult(null)
    setStatus("idle")
    setMessage(
      "Review the actual signal and GND terminals, then run the simulation.",
    )
  }

  const run = async () => {
    if (!terminals || busy) return
    try {
      const experiment = createReturnCurrentExperimentFromTrace({
        circuitJson: returnCurrentDemoBoard,
        pcbTraceId: selectedTrace,
        sourcePcbPortId: terminals.sourcePcbPortId,
        loadPcbPortId: terminals.loadPcbPortId,
        returnSourcePcbPortId: returnSource,
        returnSinkPcbPortId: returnSink,
        groundSourceNetId: "source_net_gnd",
        sourceCurrentA: current / 1000,
        sourceResistanceOhms: sourceResistance,
        loadResistanceOhms: loadResistance,
        returnSourceLayer: "top",
        returnSinkLayer: "top",
      })
      const id = crypto.randomUUID()
      submitted.current = { pcbTraceId: selectedTrace, frequencyMHz: frequency }
      activeRequest.current = id
      setResult(null)
      setStatus("queued")
      setMessage("Submitting the synthetic Circuit JSON experiment…")
      const response = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "REQUEST_RETURN_CURRENT_SIMULATION",
          request_id: id,
          circuit_json: experiment.circuitJson,
          experiment_id: experiment.experimentId,
          frequency_hz: frequency * 1e6,
          copper_model: "surface_impedance_copper",
          sample_layer: "bottom",
          cell_size: cellSize,
          mesh_size: meshSize,
          order,
          air_padding: 2,
          processes: 1,
        }),
      })
      const ack = await response.json()
      if (!response.ok)
        throw new Error(
          ack.message || ack.error || "The CLI rejected the simulation request",
        )
      setRequestId(id)
    } catch (error) {
      setStatus("failed")
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create the experiment",
      )
    }
  }

  const numberField = (
    label: string,
    value: number,
    setter: (value: number) => void,
    step = "any",
  ) => (
    <label style={{ display: "grid", gap: 4 }}>
      {label}
      <input
        style={inputStyle}
        aria-label={label}
        type="number"
        min="0.000001"
        step={step}
        value={value}
        disabled={busy}
        onChange={(event) => setter(Number(event.target.value))}
      />
    </label>
  )

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#101e25",
        color: "#e8f0f2",
        font: "14px/1.5 system-ui,sans-serif",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24 }}>
          Return current simulation
        </h1>
        <div>
          Right-click DATA0, then choose{" "}
          <strong>Simulate → Return Current Simulation</strong>.
        </div>
        <div
          style={{ color: serverReady ? "#75dfbd" : "#f8d58b", marginTop: 6 }}
          data-testid="cli-health"
        >
          {serverMessage}
        </div>
      </header>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <section
          aria-label="PCB and return current"
          style={{
            flex: "1 1 650px",
            minWidth: 0,
            background: "#10252c",
            border: "1px solid #35515c",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <PCBViewer
            renderer="canvas"
            height={600}
            circuitJson={result?.circuitJson ?? returnCurrentDemoBoard}
            allowEditing={false}
            onSimulateReturnCurrent={chooseTrace}
            returnCurrentSimulation={
              result
                ? {
                    resultId: result.resultId,
                    layer: "bottom",
                    showHeatmap: heatmap,
                    showVectors: vectors,
                    opacity,
                    pcbTraceId: result.pcbTraceId,
                  }
                : undefined
            }
          />
          <div
            style={{
              padding: "10px 16px",
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              borderTop: "1px solid #35515c",
            }}
          >
            <label>
              <input
                type="checkbox"
                checked={heatmap}
                onChange={(event) => setHeatmap(event.target.checked)}
              />{" "}
              EM heatmap
            </label>
            <label>
              <input
                type="checkbox"
                checked={vectors}
                onChange={(event) => setVectors(event.target.checked)}
              />{" "}
              Current arrows
            </label>
            <label>
              Heat opacity{" "}
              <input
                aria-label="Heat opacity"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(event) => setOpacity(Number(event.target.value))}
              />
            </label>
            {result && <strong>{result.frequencyMHz} MHz · Bottom GND</strong>}
          </div>
        </section>
        <section
          aria-label="Return current simulation setup"
          style={{
            flex: "0 1 340px",
            display: "grid",
            gap: 12,
            background: "#172e37",
            padding: 18,
            border: "1px solid #35515c",
            borderRadius: 8,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {selectedTrace
              ? selectedTrace.replace("pcb_trace_", "").toUpperCase()
              : "Choose a trace on the PCB"}
          </h2>
          {terminals && (
            <div>
              Signal:{" "}
              <strong>
                {terminals.source.label} → {terminals.load.label}
              </strong>
            </div>
          )}
          <label style={{ display: "grid", gap: 4 }}>
            Driver GND return sink
            <select
              aria-label="Driver GND return sink"
              style={inputStyle}
              value={returnSink}
              disabled={busy}
              onChange={(event) => setReturnSink(event.target.value)}
            >
              {groundCandidates.map((port) => (
                <option key={port.pcbPortId} value={port.pcbPortId}>
                  {port.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            Load GND return source
            <select
              aria-label="Load GND return source"
              style={inputStyle}
              value={returnSource}
              disabled={busy}
              onChange={(event) => setReturnSource(event.target.value)}
            >
              {groundCandidates.map((port) => (
                <option key={port.pcbPortId} value={port.pcbPortId}>
                  {port.label}
                </option>
              ))}
            </select>
          </label>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {numberField("Frequency (MHz)", frequency, setFrequency)}
            {numberField("Peak current (mA)", current, setCurrent)}
            {numberField(
              "Source resistance (Ω)",
              sourceResistance,
              setSourceResistance,
            )}
            {numberField(
              "Load resistance (Ω)",
              loadResistance,
              setLoadResistance,
            )}
            {numberField("Cell size (mm)", cellSize, setCellSize)}
            {numberField("FEM target (mm)", meshSize, setMeshSize)}
          </div>
          <label style={{ display: "grid", gap: 4 }}>
            FEM order
            <select
              aria-label="FEM order"
              style={inputStyle}
              value={order}
              disabled={busy}
              onChange={(event) => setOrder(Number(event.target.value))}
            >
              <option value={1}>First order (P1)</option>
              <option value={2}>Second order (P2)</option>
            </select>
          </label>
          <button
            type="button"
            style={{
              ...inputStyle,
              background: "#087e83",
              borderColor: "#49bcc1",
              fontWeight: 700,
              cursor: busy ? "wait" : "pointer",
              opacity: !terminals || !serverReady || busy ? 0.5 : 1,
            }}
            disabled={!terminals || !serverReady || busy}
            onClick={() => void run()}
          >
            {busy ? "Simulation running…" : "Run return current simulation"}
          </button>
          <div
            role="status"
            data-testid="simulation-status"
            data-status={status}
            style={{
              color: status === "failed" ? "#ffb3ac" : "#c5e4e4",
              overflowWrap: "anywhere",
            }}
          >
            {message}
          </div>
          <small style={{ color: "#a4bcc6" }}>
            Two-layer FR-4, 0.8 mm spacing, 35 µm copper. Finite-conductivity
            surface impedance. P2 at the default mesh can take several minutes.
          </small>
        </section>
      </div>
    </main>
  )
}
