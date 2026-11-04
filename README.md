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

There are two main ways to use the PCBViewer:

`PCBViewer` does not take `children` — it renders `circuitJson`. There are two ways to get there.

### 1. Compile JSX components with `@tscircuit/core` first

```bash
npm install @tscircuit/core
```

`Circuit` turns the declarative elements into circuit JSON; the viewer renders the result:

```tsx
import React, { useEffect, useState } from "react"
import { Circuit } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import { PCBViewer } from "@tscircuit/pcb-viewer"

export default () => {
  const [circuitJson, setCircuitJson] = useState<AnyCircuitElement[]>([])

  useEffect(() => {
    const circuit = new Circuit()
    circuit.add(
      <board width="20mm" height="20mm">
        <resistor name="R1" footprint="0805" resistance="10k" />
        <capacitor name="C1" footprint="0603" capacitance="100nF" />
      </board>,
    )
    circuit.render()
    setCircuitJson(circuit.getCircuitJson())
  }, [])

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}
```

### 2. Using Circuit JSON

If you already have circuit JSON data, you can pass it directly:

```tsx
import React from "react"
import { PCBViewer } from "@tscircuit/pcb-viewer"

const circuitJson = [
  {
    type: "pcb_component",
    pcb_component_id: "R1",
    center: { x: 0, y: 0 },
    // ... other component properties
  },
  // ... more elements
]

export default () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}
```

### Props

The PCBViewer component accepts these props (see `Props` in `src/PCBViewer.tsx`):

- `circuitJson`: Circuit JSON elements to render. Required for anything to appear.
- `height`: Height of viewer in pixels (default: 600)
- `renderer`: `"webgpu" | "canvas"` — initial engine override, otherwise the saved user preference
- `allowEditing`: Enable/disable editing capabilities (default: true)
- `editEvents`: Array of edit events to apply
- `onEditEventsChanged`: Callback when edit events change
- `focusOnHover`: Enable focus on hover for mouse/keyboard navigation (default: false)
- `clickToInteractEnabled`: Render an interaction overlay so page scroll does not zoom/pan the board (default: false)
- `debugGraphics`: `GraphicsObject | null` — draw autorouter debug overlay graphics
- `disablePcbGroups`: Hide group containers and highlights (default: false)
- `initialState`: Initial state for the viewer
- `controller`: Controller returned by `usePcbViewerController`
- `onRenderComplete`: Called once after the active renderer first paints the current circuit JSON
- `onBoundsSelected`: Callback when the Bounds tool completes a rectangle selection. Receives `{ minX, minY, maxX, maxY }`.
- `onViewSchematicComponent`: Optional callback for the pad context menu action `↗︎ U1 on Schematic`. Receives `{ source_component_id, pcb_component_id, refdes }`. Omit it when the host schematic tab is disabled.

### Features

- Interactive PCB viewing with pan and zoom
- Multiple layer support (top, bottom, inner layers)
- Component placement editing and manual edits
- Net connectivity highlighting
- PCB group hierarchies, shown or suppressed via `disablePcbGroups`
- Autoroute debug graphics via `debugGraphics`
- DRC (Design Rule Check) visualization
- Measurement tools
- WebGPU and Canvas rendering engines, switchable at runtime

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
`https://jscdn.tscircuit.com/@tscircuit/circuit-json-webgpu/0.0.3.tgz`.
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
