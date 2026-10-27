# @tscircuit/pcb-viewer

[![npm version](https://badge.fury.io/js/@tscircuit%2Fpcb-viewer.svg)](https://badge.fury.io/js/@tscircuit%2Fpcb-viewer)

[Examples](https://pcb-viewer.vercel.app/) &middot; [TSCircuit](https://tscircuit.com)

Render Printed Circuit Boards w/ React

If you want to render to an image, check out [circuit-to-png](https://github.com/tscircuit/circuit-to-png)

![image](https://github.com/tscircuit/pcb-viewer/assets/1910070/e010f44e-b8c0-4e1d-9d59-1ea66716427f)

## Usage

```bash
npm install @tscircuit/pcb-viewer
```

`PCBViewer` renders [Circuit JSON](https://github.com/tscircuit/circuit-json) passed via the `circuitJson` prop.

### 1. Passing Circuit JSON Directly

```tsx
import React from "react"
import { PCBViewer } from "@tscircuit/pcb-viewer"

const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_0",
    source_component_id: "source_component_0",
    center: { x: 0, y: 0 },
    layer: "top",
    rotation: 0,
    width: 2,
    height: 1.2,
  },
]

export default () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}
```

### 2. Generating Circuit JSON from `@tscircuit/core`

If you define your circuit with tscircuit JSX components, compile it to Circuit JSON with `@tscircuit/core` first and pass the resulting array to `PCBViewer`:

```tsx
import React from "react"
import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "@tscircuit/pcb-viewer"

const circuit = new Circuit()
circuit.add(
  <board width="10mm" height="10mm">
    <resistor name="R1" footprint="0805" resistance="10k" pcbX={-2} />
    <capacitor name="C1" footprint="0603" capacitance="100nF" pcbX={2} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>,
)
circuit.render()
const circuitJson = circuit.getCircuitJson()

export default () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}
```

### Props

The `PCBViewer` component accepts these props:

- `circuitJson`: `AnyCircuitElement[]` — Circuit JSON elements array to render
- `height`: `number` — Height of viewer in pixels (default: `600`)
- `renderer`: `"webgpu" | "canvas"` — Initial rendering engine override (defaults to saved preference or `"webgpu"`)
- `allowEditing`: `boolean` — Enable/disable interactive component placement editing (default: `true`)
- `editEvents`: `ManualEditEvent[]` — Array of manual edit events to apply
- `onEditEventsChanged`: `(editEvents: ManualEditEvent[]) => void` — Callback when manual edit events change
- `onRenderComplete`: `() => void` — Called once after the active renderer first paints the current Circuit JSON
- `onBoundsSelected`: `(bounds: BoundsSelection) => void` — Callback when the Bounds tool completes a rectangle selection. Receives `{ minX, minY, maxX, maxY }`.
- `onViewSchematicComponent`: `(event: ViewSchematicComponentEvent) => void` — Optional callback for the pad context menu action `↗︎ U1 on Schematic`. Receives `{ source_component_id, pcb_component_id, refdes }`. Omit it when the host schematic tab is disabled.
- `focusOnHover`: `boolean` — Focus/highlight elements on hover (default: `false`)
- `clickToInteractEnabled`: `boolean` — Require a click or tap overlay before enabling pan/zoom interaction (default: `false`)
- `disablePcbGroups`: `boolean` — Hide PCB group overlays by default (default: `false`)
- `debugGraphics`: `GraphicsObject | null` — Optional `graphics-debug` overlay object
- `initialState`: `Partial<StateProps>` — Initial viewer state overrides
- `controller`: `PcbViewerController` — Controller returned by `usePcbViewerController()` for programmatic actions such as `focusComponent(pcbComponentId)`

### Features

- Interactive PCB viewing with pan, zoom, and layer visibility controls
- Multiple layer support (top, bottom, and inner copper layers) with WebGPU and 2D Canvas rendering backends
- X-Ray mode, net connectivity highlighting, and copper pour opacity controls
- Interactive component placement editing (`editEvents` / `onEditEventsChanged`)
- Trace, ratsnest, and DRC (Design Rule Check) error visualization
- Dimension and bounds measurement tools
- Programmatic component focusing (`usePcbViewerController`) and schematic cross-probing (`onViewSchematicComponent`)

### WebGPU rendering

`PCBViewer` defaults to `renderer="webgpu"`. It uses
[`circuit-json-webgpu`](https://github.com/tscircuit/circuit-json-webgpu) inside a
Web Worker with an OffscreenCanvas. Circuit geometry is compiled and uploaded
once per scene; pan and zoom update the camera and draw retained GPU buffers
continuously. The main thread handles React, interaction, and view messages.
There is no bitmap zoom-settle delay or pool of raster workers.

Pass `renderer="canvas"` to explicitly use the existing Canvas renderer. WebGPU
stays selected when WebGPU/OffscreenCanvas is unavailable, initialization fails,
the GPU device is lost, or the scene includes unsupported geometry (such as
dimension annotations or interpolated trace routes). These failures display an
error in the viewer and release the worker; they never start the Canvas renderer.
If the installed WebGPU renderer does not support X-Ray, the viewer displays a
notice and keeps the GPU view visible. The initial GPU geometry compile
still takes time on large boards, but runs in the worker. Curves use fixed
triangle tessellation and can show facets at extreme zoom.

Right-click the board and choose **Rendering Engine → Canvas** or
**WebGPU (experimental)** to switch without resetting pan, zoom, or layer visibility.
The `renderer` prop sets the initial selection; changing that prop updates the selection.
Switching to Canvas always requires an explicit engine selection.

Run `bun run test:webgpu` after `bunx playwright install chromium` to test the built
viewer bundle, AM3352 wheel zoom, resize, StrictMode cleanup, context-menu switching,
and failure handling. The Cosmos `WebGpuAm3352` fixture also switches between backends.

The WebGPU integration is still experimental. The complete imported Canvas suite
currently exposes substantial non-text parity gaps, including soldermask, trace
clipping, and keepouts. See the renderer's
[full parity report](https://github.com/tscircuit/circuit-json-webgpu/blob/main/tests/parity/latest-report.json).
The integration PR remains draft until these are resolved; existing diagnostics
do not yet detect every visual mismatch.

The WebGPU renderer is installed as a bundled devDependency from
`https://jscdn.tscircuit.com/@tscircuit/circuit-json-webgpu/0.0.10.tgz`.
The renderer repository includes a TypeScript local render command and 597
SVG-left/WebGPU-right feature snapshot tests.

### Navigate from a pad to a schematic

Click or right-click an SMT pad or plated hole to see its component's manufacturer
part number in a disabled row at the bottom of the context menu, when available.
Passing `onViewSchematicComponent` also enables the schematic action:

```tsx
<PCBViewer
  circuitJson={circuitJson}
  onViewSchematicComponent={schematicTabEnabled ? ({ source_component_id }) => {
    // The host switches tabs and focuses the matching schematic component.
    showSchematicComponent(source_component_id)
  } : undefined}
/>
```

The callback uses the source component ID so hosts can resolve the corresponding
schematic component even when reference designators repeat across subcircuits.
RunFrame and CircuitJsonViewer can forward this callback from their shared PCB
preview when the schematic tab is enabled. Tab switching and schematic zooming
are implemented by the host; PCBViewer does not require schematic elements.
