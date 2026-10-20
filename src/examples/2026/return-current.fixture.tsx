import { PCBViewer } from "../../PCBViewer"
import { returnCurrentDemoBoard } from "../../assets/return-current-board"
import { createReturnCurrentSimulationClient } from "../../lib/return-current-client"

declare const __RETURN_CURRENT_API_URL__: string

const simulationDialog = {
  client: createReturnCurrentSimulationClient({
    baseUrl:
      typeof __RETURN_CURRENT_API_URL__ === "string"
        ? __RETURN_CURRENT_API_URL__
        : "/api",
  }),
  resumeRequestId:
    typeof window === "undefined"
      ? undefined
      : (new URLSearchParams(window.location.search).get(
          "return_current_request_id",
        ) ?? undefined),
  onRequestIdChange: (requestId: string) => {
    const url = new URL(window.location.href)
    if (requestId) url.searchParams.set("return_current_request_id", requestId)
    else url.searchParams.delete("return_current_request_id")
    window.history.replaceState(null, "", url)
  },
}

export default function ReturnCurrentSimulationDemo() {
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
          <strong>Simulate → Return Current Simulation</strong> to configure and
          run it in the dialog.
        </div>
      </header>
      <section
        aria-label="PCB and return current"
        style={{
          background: "#10252c",
          border: "1px solid #35515c",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <PCBViewer
          renderer="canvas"
          height={640}
          circuitJson={returnCurrentDemoBoard}
          allowEditing={false}
          returnCurrentSimulationDialog={simulationDialog}
        />
      </section>
    </main>
  )
}
