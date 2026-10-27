# Return-current simulation in PCBViewer

Right-click DATA0 and choose **Simulate → Return Current Simulation**. The dialog owns configuration, backend availability, job status, and display controls. Closing it preserves settings and an active job; the **Return current simulation** button reopens it. Completed results show a heatmap, phase arrows, the selected trace, and physical GND contacts.

Simulate is the last context-menu entry. The dialog lazily loads the pinned Tailwind CDN with scoped light styles and a fallback when the CDN is unavailable.

## Development

```sh
bun install
bun run dev:return-current
```

Open **http://127.0.0.1:3000/tests/return-current-dev/**, or the `2026/return-current` Cosmos fixture. The example uses `https://simulate.tscircuit.com/api` by default. Python, Docker, and the solver are not dependencies of PCBViewer.

The [separate service repository](https://github.com/tscircuit/simulate.tscircuit.com) owns simulation execution, storage, and deployment. Its `bun run dev` runs the service locally with Docker. To connect the viewer to that service, or a future compatible CLI server, set the server's `/api` root:

```sh
VITE_RETURN_CURRENT_API_URL=http://localhost:8787/api bun run dev:return-current
# A compatible CLI server can instead use http://localhost:3020/api.
```

The service must allow the frontend origin. The client appends `/simulations/v1/return-current` and uses health, job submission, status, and result endpoints. Results are Circuit JSON arrays addressed by job ID. It does not use the CLI's event, file, or cache routes. [API contract](https://github.com/tscircuit/simulate.tscircuit.com/blob/main/docs/api.md).

## Embedding

```tsx
import {
  PCBViewer,
  createReturnCurrentSimulationClient,
} from "@tscircuit/pcb-viewer"
import type { AnyCircuitElement } from "circuit-json"

const client = createReturnCurrentSimulationClient() // Same-origin /api

export const Board = ({ circuitJson }: { circuitJson: AnyCircuitElement[] }) => (
  <PCBViewer
    circuitJson={circuitJson}
    returnCurrentSimulationDialog={{ client }}
  />
)
```

Keep the client stable across renders. The option also accepts a request ID to resume and callbacks for request IDs and completed results. Hosts with custom workflows can use `onSimulateReturnCurrent` instead.

The example stores the request ID in its URL. Reopening a completed result, reloading, and changing display controls do not submit another solve.

## Code layout

The feature lives in `src/lib/return-current/`: `client.ts` handles HTTP, `experiment.ts` builds Circuit JSON definitions, `overlay.ts` loads fields and maps coordinates, and `types.ts` defines viewer options. Its React components and hooks are contained in `components/` and `hooks/`; `tailwind.ts` owns dialog styling. Shared trace hit-testing and context-menu integration stay in the viewer. Unit tests are grouped under `tests/lib/return-current/`.

## Verification

```sh
bunx playwright install chromium
bun tests/return-current-dev/lifecycle.ts
```

The bounded browser checks inject a typed client without running a solver. They cover availability/retry, submission errors, edited settings, focus/Escape, closing/reopening an active job, context-menu placement, lazy styling, and CDN fallback.

To check an existing real result against the configured service without submitting a job:

```sh
bun tests/return-current-dev/lifecycle.ts --reopen-existing YOUR_COMPLETED_REQUEST_ID
```

`bun run test:return-current` is an opt-in test that submits one fresh real solve with the dialog defaults. Both real-result checks start Vite on port 3000; set `RETURN_CURRENT_BROWSER_URL` to reuse an already-running frontend. Screenshots and receipts go into ignored `actual/` directories.

Defaults are 400 MHz, 5 mA peak, 25 Ω source/100 Ω load, 0.01 mm field sampling, 0.5 mm mesh target, and second-order elements. **The full-resolution preset exceeded the hosted service's 15-minute limit.** A coarser hosted run completed and passed result/reload checks; see the [deployment verification and saved result](https://github.com/tscircuit/simulate.tscircuit.com/blob/main/docs/deployment.md). Neither is evidence of mesh convergence.

The `2026/return-current-four-layer` fixture (or `?four_layer=1` in the development page) has a top/inner1 signal with blind vias, ground through-vias, and inner2/bottom ground pours. Four-layer runs require an explicit stackup and start with coarse P1, 2 mm mesh and 0.1 mm samples. Run the native browser check with `RETURN_CURRENT_FOUR_LAYER=1 bun run test:return-current`.

For a 1.2 mm four-layer board, the dialog offers **JLCPCB JLC04121H-7628 (assumed)**. The dimensions and dielectric constants come from [JLCPCB's published stackup](https://jlcpcb.com/impedance), retrieved 2026-10-27. Loss tangent 0.02 is a separate assumption. All fields are editable. Physical layers sum to 1.1212 mm and are not stretched to the nominal board thickness. Other board thicknesses require explicit input; a layer count does not identify a fabrication stackup.

The AM3352 repro resolves all 22 DDR signals across their seven physical trace
records, including standalone via records. Selecting any of the 154 fragments
identifies the same U1/U3 terminal pair. Branched nets and broken routes still
fail explicitly.

Its existing **inner1 ground pour** is the default reference beneath the signal
pads. This models the PCB interconnect relative to that plane; package ground-pin
paths are excluded. Physical ground-pad contacts remain selectable, but an
aperture crossing unrelated copper is rejected by the native solver.

The 70 × 60 mm board defaults to a local region with an adjustable margin
(0.25–20 mm). The dialog shows its dimensions; the hosted 400 mm² limit applies
to this region. All modeled nets within the rectangle are retained. Compare
larger margins for boundary effects. The original Circuit JSON board remains
unchanged, and saved jobs restore the region and fabrication stackup. CLI and
Runframe are unchanged.

A native AM3352 **DDR_DQSn1** run at 400 MHz completed with a **0.25 mm
margin**, inner1 pour contacts, 5 mA peak current, 50 Ω source/load ports,
P1 / 2 mm mesh, 0.1 mm samples, 2 mm air padding and four processes. The
201,459-tetrahedron solve and field export took about 11 minutes locally.
This is an execution check, not a converged reference: dense traces or larger
margins can exceed the hosted 30-minute budget. The AM3352 fixture stores the
job ID in its URL so refresh restores the result without resubmitting.

The same DDR_DQSn1 case also completed through the hosted Cloudflare service in
about **19 minutes**, with 1,264 valid inner1 samples. Its saved result passed
public-preview heatmap, vector, ground-contact, display-control and reload checks
with zero new submissions. [Open the saved AM3352 result](https://pcb-viewer-git-feat-return-current-dev-experiment-tscircuit.vercel.app/renderer.html?fixtureId=%7B%22path%22%3A%22src%2Fexamples%2F2026%2Frepros%2Fam3352-dev-board%2Fam3352-dev-board.fixture.tsx%22%7D&locked=true&return_current_request_id=2043d62d-e533-4bca-bd82-51ae52e4bc69).
