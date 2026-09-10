import type { AnyCircuitElement } from "circuit-json"
import { useMemo, useState } from "react"
import { PCBViewer } from "../../../PCBViewer"

const createCircuitJson = (routeVariant: "upper" | "lower") =>
  [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      width: 22,
      height: 18,
      center: { x: 0, y: 0 },
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_start",
      pcb_component_id: "pcb_component_start",
      shape: "rect",
      x: -8,
      y: -6,
      width: 1.5,
      height: 1.5,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_end",
      pcb_component_id: "pcb_component_end",
      shape: "rect",
      x: 8,
      y: 6,
      width: 1.5,
      height: 1.5,
      layer: "top",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_0",
      route: [
        {
          route_type: "wire",
          x: -8,
          y: -6,
          width: 0.3,
          layer: "top",
        },
        {
          route_type: "wire",
          x: 0,
          y: routeVariant === "upper" ? 5 : -5,
          width: 0.3,
          layer: "top",
        },
        {
          route_type: "wire",
          x: 8,
          y: 6,
          width: 0.3,
          layer: "top",
        },
      ],
    },
  ] as AnyCircuitElement[]

export const TraceRouteCacheInvalidation = () => {
  const [routeVariant, setRouteVariant] = useState<"upper" | "lower">("upper")
  const circuitJson = useMemo(
    () => createCircuitJson(routeVariant),
    [routeVariant],
  )

  const toggleRoute = () => {
    setRouteVariant((current) => (current === "upper" ? "lower" : "upper"))
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        boxSizing: "border-box",
        background: "#111827",
        color: "#f9fafb",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Trace route cache invalidation repro</h1>
      <p style={{ maxWidth: 820, lineHeight: 1.5, color: "#d1d5db" }}>
        Both viewers receive the same Circuit JSON. Toggle the route between an
        upper and lower middle point. The left viewer reuses its cached trace,
        while the keyed viewer on the right remounts and shows the requested
        geometry.
      </p>
      <button
        type="button"
        onClick={toggleRoute}
        style={{
          marginBottom: 16,
          border: 0,
          borderRadius: 6,
          padding: "10px 14px",
          background: "#2563eb",
          color: "white",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Show {routeVariant === "upper" ? "lower" : "upper"} route
      </button>
      <div style={{ marginBottom: 12 }}>
        Requested route: <strong>{routeVariant}</strong>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        <section>
          <h2 style={{ fontSize: 16 }}>Cached viewer (actual)</h2>
          <PCBViewer circuitJson={circuitJson} height={440} />
        </section>
        <section>
          <h2 style={{ fontSize: 16 }}>Forced remount (expected)</h2>
          <PCBViewer
            key={routeVariant}
            circuitJson={circuitJson}
            height={440}
          />
        </section>
      </div>
    </div>
  )
}

export default TraceRouteCacheInvalidation
