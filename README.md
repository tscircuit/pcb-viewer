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
- `initialState`: Initial state for the viewer

### Features

- Interactive PCB viewing with pan and zoom
- Multiple layer support (top, bottom, inner layers)
- Component placement editing
- Trace routing
- DRC (Design Rule Check) visualization
- Measurement tools

### Background rendering

PCB layers render in a pool of four Web Workers by default. The visible canvases
only draw completed images. Panning and zooming immediately transform cached
images; after 120 ms without camera movement, the viewer requests sharper images
for the new region. Results appear layer by layer, with the board and selected
copper layer prioritized.

```tsx
<PCBViewer
  circuitJson={circuitJson}
  renderOptions={{
    workerCount: 4,
    settleDelayMs: 120,
    maxCacheBytes: 128 * 1024 * 1024,
  }}
/>
```

`CanvasElementsRenderer` accepts the same `renderOptions`. Set `workerCount: 0`
to force the fallback. When Workers or OffscreenCanvas 2D are unavailable, worker
startup fails, or a worker errors, the same rendering queue runs on detached
main-thread canvases, yielding between layers. A single fallback layer can still
block input while it draws.

Regions include overscan and use quantized zoom levels, so nearby views can reuse
images. The cache evicts older regions first and closes discarded ImageBitmaps.
The latest image per layer is retained even if that active set exceeds
`maxCacheBytes`. Circuit changes invalidate old images; hover changes keep the
previous image visible until its replacement arrives. Worker count changes and
unmounting terminate the pool and release its images.

The published bundle includes its worker code; no separate worker asset needs
hosting. The default factory uses a blob URL and is loaded lazily for SSR. Hosts
with custom worker hosting or CSP requirements can pass
`workerFactory: () => Worker | Promise<Worker>` implementing the protocol in
`src/lib/rendering/types.ts`. Geometry rasterization runs in workers; React UI,
interaction metadata, hit testing, grid, and editing/debug overlays remain on the
main thread.

Rendering checks:

```sh
bun test tests
bun run build
bunx tsc --noEmit
bun run test:rendering:browser
```

The browser test starts Vite and uses Playwright Chromium (install it with
`bunx playwright install chromium`). It checks worker/fallback image parity,
settled-zoom scheduling, unsupported/failed workers, and the AM3352 repro.
