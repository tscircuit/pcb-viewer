# @tscircuit/pcb-viewer

[![npm version](https://badge.fury.io/js/@tscircuit%2Fpcb-viewer.svg)](https://badge.fury.io/js/@tscircuit%2Fpcb-viewer)

[Examples](https://pcb-viewer.vercel.app/) &middot; [TSCircuit](https://tscircuit.com) &middot; [Open in CodeSandbox](https://codesandbox.io/p/github/tscircuit/pcb-viewer)

Render Printed Circuit Boards w/ React

If you want to render to an image, check out [circuit-to-png](https://github.com/tscircuit/circuit-to-png)

![image](https://github.com/tscircuit/pcb-viewer/assets/1910070/e010f44e-b8c0-4e1d-9d59-1ea66716427f)

## Usage

```bash
npm install @tscircuit/pcb-viewer
```

There are two main ways to use the PCBViewer:

### 1. Using Circuit Components

This approach allows you to declaratively define your circuit using React components:

```tsx
import React from "react"
import { PCBViewer } from "@tscircuit/pcb-viewer"

export default () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor footprint="0805" resistance="10k" />
        <capacitor footprint="0603" capacitance="100nF" />
      </PCBViewer>
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

The PCBViewer component accepts these props:

- `children`: Circuit components to render
- `circuitJson`: Circuit JSON elements array (alternative to children)
- `height`: Height of viewer in pixels (default: 600)
- `allowEditing`: Enable/disable editing capabilities (default: true)
- `editEvents`: Array of edit events to apply
- `onEditEventsChanged`: Callback when edit events change
- `onBoundsSelected`: Callback when the Bounds tool completes a rectangle selection. Receives `{ minX, minY, maxX, maxY }`.
- `onViewSchematicComponent`: Optional callback for the pad context menu action `↗️ U1 on Schematic`. Receives `{ source_component_id, pcb_component_id, refdes }`. Omit it when the host schematic tab is disabled.
- `initialState`: Initial state for the viewer

### Features

- Interactive PCB viewing with pan and zoom
- Multiple layer support (top, bottom, inner layers)
- Component placement editing
- Trace routing
- DRC (Design Rule Check) visualization
- Measurement tools

### WebGPU rendering

`PCBViewer` defaults to `renderer="webgpu"`. It uses
[`circuit-json-webgpu`](https://github.com/tscircuit/circuit-json-webgpu) inside a
Web Worker with an OffscreenCanvas. Circuit geometry is compiled and uploaded
once per scene; pan and zoom update the camera and draw retained GPU buffers
continuously. The main thread handles React, interaction, and view messages.
There is no bitmap zoom-settle delay or pool of raster workers.

Pass `renderer="canvas"` to explicitly use the existing Canvas renderer. WebGPU
also falls back to Canvas when WebGPU/OffscreenCanvas is unavailable, initialization
fails, the GPU device is lost, or the scene includes unsupported geometry (such
as dimension annotations or interpolated trace routes). The initial GPU geometry compile
still takes time on large boards, but runs in the worker. Curves use fixed
triangle tessellation and can show facets at extreme zoom.

Right-click the board and choose **Rendering Engine → Canvas** or
**WebGPU (experimental)** to switch without resetting pan, zoom, or layer visibility.
The `renderer` prop sets the initial selection; changing that prop updates the selection.
Selecting WebGPU still permits automatic Canvas fallback on unsupported devices or scenes.

Run `bun run test:webgpu` after `bunx playwright install chromium` to test the built
viewer bundle, AM3352 wheel zoom, resize, StrictMode cleanup, context-menu switching,
and fallbacks. The Cosmos `WebGpuAm3352` fixture also switches between backends.

The WebGPU integration is still experimental. The complete imported Canvas suite
currently exposes substantial non-text parity gaps, including soldermask, trace
clipping, and keepouts. See the renderer's
[full parity report](https://github.com/tscircuit/circuit-json-webgpu/blob/main/tests/parity/latest-report.json).
The integration PR remains draft until these are resolved; existing diagnostics
and Canvas fallback do not yet detect every visual mismatch.

The WebGPU renderer is installed as a bundled devDependency from
`https://jscdn.tscircuit.com/@tscircuit/circuit-json-webgpu/0.0.3.tgz`.
The renderer repository includes a TypeScript local render command and 597
SVG-left/WebGPU-right feature snapshot tests.

### Navigate from a pad to a schematic

Click or right-click an SMT pad or plated hole to see its component's manufacturer
part number in a disabled box at the bottom of the context menu, when available.
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
