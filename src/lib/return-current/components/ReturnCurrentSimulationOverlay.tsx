import { getReturnCurrentTraceTerminals } from "../experiment"
import {
  type AnyCircuitElement,
  type PcbTrace,
  type SimulationReturnCurrentExcitation,
  type SimulationPcbReturnCurrentHeatmap,
  simulation_pcb_return_current_heatmap,
  simulation_pcb_return_current_marker,
  simulation_pcb_return_current_result,
} from "circuit-json"
import { useEffect, useMemo, useState } from "react"
import { type Matrix, applyToPoint } from "transformation-matrix"
import {
  type LoadedReturnCurrentField,
  getReturnCurrentHeatmapMatrix,
  getReturnCurrentVectorAt,
  loadReturnCurrentFields,
} from "../overlay"
import type { ReturnCurrentSimulationOptions } from "../types"
import { zIndexMap } from "../../util/z-index-map"

const palette = [
  [0, 99, 235],
  [0, 180, 216],
  [19, 202, 70],
  [225, 233, 20],
  [255, 175, 0],
  [255, 60, 0],
] as const
const layerColor = (layer: string) =>
  layer === "top" ? "#08d9ef" : layer === "bottom" ? "#ff941f" : "#b99aff"
const matrixValue = (matrix: Matrix) =>
  `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`
const formatFrequency = (frequency?: number) => {
  if (frequency === undefined) return "Frequency-independent"
  if (frequency >= 1e9) return `${frequency / 1e9} GHz`
  if (frequency >= 1e6) return `${frequency / 1e6} MHz`
  if (frequency >= 1e3) return `${frequency / 1e3} kHz`
  return `${frequency} Hz`
}

/** Fallback for a real grid without an image. Each sample remains one pixel. */
function fieldImage({ field, grid, maximumDensity }: LoadedReturnCurrentField) {
  const canvas = document.createElement("canvas")
  canvas.width = field.columns
  canvas.height = field.rows
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Could not create a return-current image")
  const pixels = context.createImageData(field.columns, field.rows)
  for (let index = 0; index < field.columns * field.rows; index++) {
    const current = getReturnCurrentVectorAt(grid, index)
    if (!current) continue
    const fraction =
      maximumDensity > 0
        ? current.magnitude / field.copper_thickness / maximumDensity
        : 0
    const position = Math.max(0, Math.min(1, fraction)) * (palette.length - 1)
    const lower = Math.floor(position)
    const a = palette[lower]!
    const b = palette[Math.min(lower + 1, palette.length - 1)]!
    const row = Math.floor(index / field.columns)
    const column = index % field.columns
    const offset = ((field.rows - 1 - row) * field.columns + column) * 4
    for (let channel = 0; channel < 3; channel++) {
      pixels.data[offset + channel] = Math.round(
        a[channel]! + (b[channel]! - a[channel]!) * (position - lower),
      )
    }
    pixels.data[offset + 3] = 255
  }
  context.putImageData(pixels, 0, 0)
  return simulation_pcb_return_current_heatmap.parse({
    type: "simulation_pcb_return_current_heatmap",
    simulation_pcb_return_current_heatmap_id: `overlay_${field.simulation_pcb_return_current_field_id}`,
    simulation_pcb_return_current_result_id:
      field.simulation_pcb_return_current_result_id,
    layer: field.layer,
    source_net_id: field.source_net_id,
    min_x: field.min_x,
    min_y: field.min_y,
    max_x: field.min_x + field.columns * field.cell_width,
    max_y: field.min_y + field.rows * field.cell_height,
    image_asset: {
      project_relative_path: "return-current-overlay.png",
      mimetype: "image/png",
      url: canvas.toDataURL("image/png"),
    },
  })
}

export interface ReturnCurrentSimulationOverlayProps {
  circuitJson: AnyCircuitElement[]
  simulation?: ReturnCurrentSimulationOptions
  transform: Matrix
  width: number
  height: number
}

/** A passive, screen-aligned overlay; the PCB renderer retains all interaction. */
export const ReturnCurrentSimulationOverlay = ({
  circuitJson,
  simulation,
  transform,
  width,
  height,
}: ReturnCurrentSimulationOverlayProps) => {
  const resultId = simulation?.resultId
  const layer = simulation?.layer
  const key = `${resultId ?? ""}:${layer ?? ""}`
  const selection = useMemo(() => {
    try {
      if (!resultId || !layer) return { error: undefined }
      const results = circuitJson.filter(
        (element) =>
          element.type === "simulation_pcb_return_current_result" &&
          element.simulation_pcb_return_current_result_id === resultId,
      )
      if (results.length !== 1)
        throw new Error("Selected return-current result is unavailable")
      const result = simulation_pcb_return_current_result.parse(results[0])
      if (
        !circuitJson.some(
          (element) =>
            element.type === "simulation_experiment" &&
            element.simulation_experiment_id ===
              result.simulation_experiment_id &&
            element.experiment_type === "pcb_return_current",
        )
      )
        throw new Error("Simulation experiment is missing")
      if (
        !circuitJson.some(
          (element) =>
            element.type === "pcb_board" &&
            element.pcb_board_id === result.pcb_board_id,
        )
      ) {
        throw new Error("Simulation PCB is missing")
      }
      const heatmaps = circuitJson
        .filter(
          (element) =>
            element.type === "simulation_pcb_return_current_heatmap" &&
            element.simulation_pcb_return_current_result_id === resultId &&
            element.layer === layer,
        )
        .map((element) => {
          const heatmap = simulation_pcb_return_current_heatmap.parse(element)
          if (!/^data:image\/(png|webp)[;,]/i.test(heatmap.image_asset.url)) {
            throw new Error(
              "Return-current images must be embedded in Circuit JSON",
            )
          }
          return heatmap
        })
      const excitationTraceIds = new Set<string>()
      const pourContacts: Array<{
        role: "return_source" | "return_sink"
        contact: Extract<
          SimulationReturnCurrentExcitation["return_source"],
          { contact_type: "pcb_copper_pour" }
        >
      }> = []
      for (const id of result.simulation_return_current_excitation_ids) {
        const excitation = circuitJson.find(
          (element) =>
            element.type === "simulation_return_current_excitation" &&
            element.simulation_return_current_excitation_id === id,
        )
        if (
          !excitation ||
          excitation.type !== "simulation_return_current_excitation"
        ) {
          throw new Error(`Missing return-current excitation '${id}'`)
        }
        if (
          excitation.simulation_experiment_id !==
          result.simulation_experiment_id
        ) {
          throw new Error(
            "Simulation excitation belongs to a different experiment",
          )
        }
        excitationTraceIds.add(excitation.pcb_trace_id)
        for (const role of ["return_source", "return_sink"] as const) {
          const contact = excitation[role]
          if (contact.contact_type === "pcb_copper_pour") {
            if (
              !circuitJson.some(
                (element) =>
                  element.type === "pcb_copper_pour" &&
                  element.pcb_copper_pour_id === contact.pcb_copper_pour_id &&
                  element.layer === contact.layer,
              )
            )
              throw new Error(
                "Simulation return contact references a missing ground pour",
              )
            pourContacts.push({ role, contact })
          }
        }
      }
      if (
        simulation?.pcbTraceId &&
        !excitationTraceIds.has(simulation.pcbTraceId)
      ) {
        throw new Error("Selected trace does not belong to this simulation")
      }
      const traces = circuitJson.filter(
        (element): element is PcbTrace =>
          element.type === "pcb_trace" &&
          excitationTraceIds.has(element.pcb_trace_id),
      )
      if (traces.length !== excitationTraceIds.size)
        throw new Error("Simulation signal trace is missing")
      const markers = circuitJson
        .filter(
          (element) =>
            element.type === "simulation_pcb_return_current_marker" &&
            element.simulation_pcb_return_current_result_id === resultId,
        )
        .map((element) => {
          const marker = simulation_pcb_return_current_marker.parse(element)
          const target =
            marker.target_type === "pcb_port"
              ? circuitJson.find(
                  (candidate) =>
                    candidate.type === "pcb_port" &&
                    candidate.pcb_port_id === marker.pcb_port_id,
                )
              : circuitJson.find(
                  (candidate) =>
                    candidate.type === "pcb_via" &&
                    candidate.pcb_via_id === marker.pcb_via_id,
                )
          if (
            !target ||
            (target.type !== "pcb_port" && target.type !== "pcb_via")
          ) {
            throw new Error(
              "Simulation terminal references a missing PCB pad or via",
            )
          }
          return { marker, target }
        })
      return {
        result,
        heatmaps,
        traces: traces.map((trace) => {
          if (
            !trace.source_trace_id ||
            circuitJson.filter(
              (element) =>
                element.type === "pcb_trace" &&
                element.source_trace_id === trace.source_trace_id,
            ).length < 2
          )
            return trace
          const resolved = getReturnCurrentTraceTerminals(
            circuitJson,
            trace.pcb_trace_id,
          ).signalTrace
          return resolved ? { ...trace, route: resolved.route } : trace
        }),
        markers,
        pourContacts,
        error: undefined,
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }, [circuitJson, resultId, layer, simulation?.pcbTraceId])

  const [loaded, setLoaded] = useState<{
    key: string
    fields: LoadedReturnCurrentField[]
    images: SimulationPcbReturnCurrentHeatmap[]
    status: "loading" | "ready" | "error"
    error?: string
  }>({ key: "", fields: [], images: [], status: "loading" })

  useEffect(() => {
    if (!resultId || !layer || selection.error) return
    let cancelled = false
    setLoaded({ key, fields: [], images: [], status: "loading" })
    loadReturnCurrentFields(circuitJson, resultId, layer)
      .then((fields) => {
        const images = fields
          .filter(
            ({ field }) =>
              !selection.heatmaps?.some(
                (heatmap) => heatmap.source_net_id === field.source_net_id,
              ),
          )
          .map(fieldImage)
        if (!fields.length && !selection.heatmaps?.length) {
          throw new Error(
            "This result has no field or heatmap on the selected layer",
          )
        }
        if (!cancelled) setLoaded({ key, fields, images, status: "ready" })
      })
      .catch((error) => {
        if (!cancelled)
          setLoaded({
            key,
            fields: [],
            images: [],
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          })
      })
    return () => {
      cancelled = true
    }
  }, [circuitJson, resultId, layer, key, selection])

  const fields = loaded.key === key ? loaded.fields : []
  const images = [
    ...(selection.heatmaps ?? []),
    ...(loaded.key === key ? loaded.images : []),
  ]
  const state =
    selection.error || (loaded.key === key && loaded.error)
      ? "error"
      : loaded.key === key
        ? loaded.status
        : "loading"
  const error =
    selection.error ?? (loaded.key === key ? loaded.error : undefined)
  const opacity = Math.max(0, Math.min(1, simulation?.opacity ?? 0.65))
  const pixelsPerMm = Math.hypot(transform.a, transform.b)
  const vectors = useMemo(() => {
    if (simulation?.showVectors === false) return []
    return fields.flatMap(({ field, grid }) => {
      const columns = Math.max(
        1,
        Math.ceil(
          42 / (field.cell_width * Math.hypot(transform.a, transform.b)),
        ),
      )
      const rows = Math.max(
        1,
        Math.ceil(
          42 / (field.cell_height * Math.hypot(transform.c, transform.d)),
        ),
      )
      const arrows = []
      for (let row = 0; row < field.rows; row += rows) {
        for (let column = 0; column < field.columns; column += columns) {
          const index = row * field.columns + column
          const current = getReturnCurrentVectorAt(grid, index)
          if (!current || (!current.x && !current.y)) continue
          const center = applyToPoint(transform, {
            x: field.min_x + (column + 0.5) * field.cell_width,
            y: field.min_y + (row + 0.5) * field.cell_height,
          })
          if (
            center.x < -20 ||
            center.y < -20 ||
            center.x > width + 20 ||
            center.y > height + 20
          )
            continue
          const vx = transform.a * current.x + transform.c * current.y
          const vy = transform.b * current.x + transform.d * current.y
          const length = Math.hypot(vx, vy)
          if (!length) continue
          const dx = (vx / length) * 7
          const dy = (vy / length) * 7
          const ex = center.x + dx
          const ey = center.y + dy
          arrows.push({
            id: `${field.simulation_pcb_return_current_field_id}:${index}`,
            index,
            current,
            path: `M ${center.x - dx} ${center.y - dy} L ${ex} ${ey} M ${ex - dx * 0.5 - dy * 0.4} ${ey - dy * 0.5 + dx * 0.4} L ${ex} ${ey} L ${ex - dx * 0.5 + dy * 0.4} ${ey - dy * 0.5 - dx * 0.4}`,
          })
        }
      }
      return arrows
    })
  }, [fields, simulation?.showVectors, transform, width, height])

  if (!simulation || width <= 0 || height <= 0) return null

  return (
    <div
      data-return-current-overlay
      data-result-id={resultId}
      data-return-layer={layer}
      data-state={state}
      style={{
        position: "absolute",
        inset: 0,
        width,
        height,
        pointerEvents: "none",
        zIndex: zIndexMap.elementOverlay,
        overflow: "hidden",
      }}
    >
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Return-current simulation on ${layer}, ${formatFrequency(selection.result?.frequency_hz)}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <title>Return-current simulation on the PCB</title>
        {simulation.showHeatmap !== false &&
          images.map((image) => (
            <image
              key={image.simulation_pcb_return_current_heatmap_id}
              data-type="simulation_pcb_return_current_heatmap"
              data-return-layer={image.layer}
              data-units="A/mm²"
              href={image.image_asset.url}
              x={0}
              y={0}
              width={1}
              height={1}
              transform={matrixValue(
                getReturnCurrentHeatmapMatrix(image, transform),
              )}
              preserveAspectRatio="none"
              opacity={opacity}
              style={{ imageRendering: "pixelated" }}
            />
          ))}
        <g data-return-current-vectors>
          {vectors.map((arrow) => (
            <path
              key={arrow.id}
              data-type="simulation_pcb_return_current_vector"
              data-grid-index={arrow.index}
              data-arrow-reference="excitation-current-peak"
              data-sheet-current-x={arrow.current.x}
              data-sheet-current-y={arrow.current.y}
              d={arrow.path}
              fill="none"
              stroke="white"
              strokeWidth={1.2}
            />
          ))}
        </g>
        {selection.traces?.map((trace) => (
          <g
            key={trace.pcb_trace_id}
            data-return-current-signal
            data-pcb-trace-id={trace.pcb_trace_id}
          >
            {trace.route.map((point, index) => {
              if (point.route_type === "via") {
                const center = applyToPoint(transform, point)
                const next = trace.route[index + 1]
                const end =
                  next?.route_type === "wire"
                    ? applyToPoint(transform, next)
                    : undefined
                return (
                  <g
                    key={`via:${point.x}:${point.y}:${point.from_layer}:${point.to_layer}`}
                    data-signal-transition={`${point.from_layer}:${point.to_layer}`}
                  >
                    {end && next?.route_type === "wire" && (
                      <line
                        data-signal-layer={next.layer}
                        x1={center.x}
                        y1={center.y}
                        x2={end.x}
                        y2={end.y}
                        stroke={layerColor(next.layer)}
                        strokeWidth={Math.max(3, next.width * pixelsPerMm)}
                        strokeLinecap="round"
                      />
                    )}
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={Math.max(
                        4,
                        ((point.outer_diameter ?? 0.25) * pixelsPerMm) / 2,
                      )}
                      fill="#102b29"
                      stroke={layerColor(point.to_layer)}
                      strokeWidth={2}
                    />
                  </g>
                )
              }
              if (point.route_type === "through_pad") {
                const start = applyToPoint(transform, point.start)
                const end = applyToPoint(transform, point.end)
                return (
                  <line
                    key={`pad:${point.start_layer}:${start.x}:${start.y}:${end.x}:${end.y}`}
                    data-signal-layer={point.start_layer}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={layerColor(point.start_layer)}
                    strokeWidth={Math.max(3, point.width * pixelsPerMm)}
                    strokeLinecap="round"
                  />
                )
              }
              if (point.route_type !== "wire") return null
              const next = trace.route[index + 1]
              if (
                !next ||
                (next.route_type === "wire" && next.layer !== point.layer)
              )
                return null
              const start = applyToPoint(transform, point)
              const end = applyToPoint(
                transform,
                next.route_type === "through_pad" ? next.start : next,
              )
              return (
                <line
                  key={`wire:${point.layer}:${start.x}:${start.y}:${end.x}:${end.y}`}
                  data-signal-layer={point.layer}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={layerColor(point.layer)}
                  strokeWidth={Math.max(3, point.width * pixelsPerMm)}
                  strokeLinecap="round"
                />
              )
            })}
          </g>
        ))}
        {selection.markers?.map(({ marker, target }) => {
          const center = applyToPoint(transform, target)
          const label = marker.label ?? marker.role.replaceAll("_", " ")
          const color = marker.role.startsWith("return_")
            ? "#ed80e6"
            : "#08d9ef"
          const labelWidth = Math.min(270, label.length * 6.2 + 12)
          const anchor =
            marker.label_x !== undefined && marker.label_y !== undefined
              ? applyToPoint(transform, {
                  x: marker.label_x,
                  y: marker.label_y,
                })
              : { x: center.x + 12, y: center.y - 15 }
          return (
            <g
              key={marker.simulation_pcb_return_current_marker_id}
              data-return-current-terminal
              data-role={marker.role}
              data-target-type={marker.target_type}
              data-target-id={
                target.type === "pcb_port"
                  ? target.pcb_port_id
                  : target.pcb_via_id
              }
            >
              <title>{label}</title>
              <circle
                cx={center.x}
                cy={center.y}
                r={7}
                fill="#071e29"
                fillOpacity={0.5}
                stroke={color}
                strokeWidth={2.5}
              />
              <line
                x1={center.x}
                y1={center.y}
                x2={anchor.x}
                y2={anchor.y}
                stroke={color}
                strokeWidth={1}
              />
              <rect
                x={anchor.x - 4}
                y={anchor.y - 14}
                width={labelWidth}
                height={19}
                rx={3}
                fill="#071e29"
                fillOpacity={0.9}
              />
              <text
                x={anchor.x + 2}
                y={anchor.y}
                fontFamily="sans-serif"
                fontSize={11}
                fill="white"
              >
                {label.length > 40 ? `${label.slice(0, 39)}…` : label}
              </text>
            </g>
          )
        })}
        {selection.pourContacts?.map(({ role, contact }, index) => {
          const center = applyToPoint(transform, contact)
          return (
            <g
              key={`pour:${index}`}
              data-return-current-terminal
              data-role={role}
              data-target-type="pcb_copper_pour"
              data-target-id={contact.pcb_copper_pour_id}
            >
              <title>{`${role.replaceAll("_", " ")} · ${contact.layer} ground pour`}</title>
              <circle
                cx={center.x}
                cy={center.y}
                r={11}
                fill="none"
                stroke="#ed80e6"
                strokeWidth={2.5}
                strokeDasharray="3 2"
              />
            </g>
          )
        })}
      </svg>
      <div
        data-return-current-legend
        style={{
          position: "absolute",
          left: 8,
          bottom: 8,
          maxWidth: Math.max(100, width - 16),
          padding: "8px 10px",
          color: "white",
          background: "#071e29eb",
          borderRadius: 5,
          font: "12px/1.4 sans-serif",
          display: "flex",
          flexWrap: "wrap",
          gap: "5px 14px",
          alignItems: "center",
        }}
      >
        <span>
          {formatFrequency(selection.result?.frequency_hz)} · {layer}
        </span>
        {fields.map(({ field, maximumDensity }) => (
          <span
            key={field.simulation_pcb_return_current_field_id}
            data-density-max={maximumDensity}
            data-units="A/mm²"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                display: "inline-block",
                width: 70,
                height: 8,
                background:
                  "linear-gradient(to right,#0063eb,#00b4d8,#13ca46,#e1e914,#ffaf00,#ff3c00)",
              }}
            />
            0–{maximumDensity.toPrecision(3)} A/mm² (foil average)
          </span>
        ))}
        <span>
          {[
            ...new Set(
              selection.traces?.flatMap((trace) =>
                trace.route.flatMap((point) =>
                  point.route_type === "wire" ? [point.layer] : [],
                ),
              ) ?? [],
            ),
          ].map((signalLayer) => (
            <span key={signalLayer} style={{ color: layerColor(signalLayer) }}>
              {signalLayer} signal ·{" "}
            </span>
          ))}
          <span style={{ color: "#ed80e6" }}>GND terminal</span>
        </span>
        {simulation.showVectors !== false && fields.length > 0 && (
          <span>Arrows: current at excitation peak</span>
        )}
        {state === "loading" && <output>Loading field…</output>}
        {error && (
          <span role="alert" style={{ color: "#ffb3ae" }}>
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
