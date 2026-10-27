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

The fixture contains one complete two-layer signal connection and its distinct GND returns. Four-layer support and unrelated board copper remain backend work. CLI and Runframe are unchanged.

The following screenshots are historical real-Palace results captured before the service extraction:

![Simulation dialog](./dialog.png)

![Real Palace result over the PCB](./screenshot.png)
