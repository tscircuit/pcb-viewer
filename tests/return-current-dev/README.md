# PCB viewer return-current development prototype

This example starts in the PCB viewer: right-click DATA0, choose **Simulate → Return Current Simulation**, review the actual signal/GND terminals, then run it. The development event server executes a fresh Palace EM solve and returns official Circuit JSON result/field/heatmap/marker records. The viewer draws the result over the original PCB, with pan/zoom, layer-colored signal highlighting, physical GND terminal markers, and heatmap/vector controls.

## Run locally

Install the JavaScript dependencies and a Python environment for the simulator. Docker must be running; the simulator uses its pinned Palace image.

```sh
bun install
python3.12 -m venv .tscircuit/palace-python
.tscircuit/palace-python/bin/pip install -r node_modules/simulate-return-current/dist/python/requirements.txt
PALACE_PYTHON="$PWD/.tscircuit/palace-python/bin/python" bun run dev:cli
```

In a second terminal:

```sh
bun run dev:return-current
```

Open **http://127.0.0.1:3000/tests/return-current-dev/**. The same example is available in Cosmos as `2026/return-current` when the CLI event server is running.

Submitting a run puts its request ID in the URL. Keep that URL to reopen the completed result after a page refresh or event-server restart; no new solve is submitted. The form configures the next run, while the overlay legend identifies the loaded result.

On virtual CPUs where the pinned image exits before its banner with a floating-point exception, use the optional compatibility launcher:

```sh
PALACE_BIN="$PWD/scripts/return-current/palace-container.ts" PALACE_PYTHON="$PWD/.tscircuit/palace-python/bin/python" bun run dev:cli
```

This disables a faulty hwloc CPUID probe in the container; the mesh, physical model and numerical settings stay unchanged.

Defaults are 400 MHz, 5 mA peak excitation, 25 Ω source and 100 Ω load, 0.01 mm sampling, a 0.5 mm FEM target and second-order elements. Physical GND return pads are separate from signal pads. A default native run can take several minutes. The PNG cells and sampled field values are not smoothed to hide mesh facets; numerical convergence is a separate check.

## Prototype boundary

Only `pcb-viewer` changes. The fake CLI transport provides `POST /api/events/create`, sequence-based `GET /api/events/list`, durable `GET /api/jobs/<id>` status, and `GET /api/files/get` for results. It queues real simulations serially and deduplicates request IDs. Original board geometry is preserved when result records are appended. Large native files stay in ignored `.tscircuit/return-current-dev/` directories.

The existing two-layer reference mesher rejects extra unexcited pads, so this fixture intentionally contains one complete signal connection and its GND return. Four-layer/high-frequency support and handling unrelated board copper remain backend work. CLI and Runframe integration can be designed around the working viewer/event contract after this prototype is reviewed.

## Verify the real workflow

```sh
bunx playwright install chromium
PALACE_PYTHON="$PWD/.tscircuit/palace-python/bin/python" bun run test:return-current
```

The opt-in browser test starts its own event/Vite servers and submits a fresh real solve. It checks the context action, synthetic definitions, distinct ground contacts, returned heatmap/vectors, zoom/toggle alignment, and reopening a completed result. Screenshots and a receipt are saved under ignored `tests/return-current-dev/actual/`. To exercise already running servers, set `RETURN_CURRENT_BROWSER_URL=http://127.0.0.1:3000/`.

This screenshot is from the real 400 MHz browser run at the defaults above (103,848 tetrahedra, P2, 800 × 600 samples). It is a workflow check; no mesh-convergence claim is made.

![Real Palace result displayed over the interactive PCB](./screenshot.png)
