# @tscircuit/pcb-viewer

[![npm version](https://badge.fury.io/js/@tscircuit/pcb-viewer.svg)](https://badge.fury.io/js/@tscircuit/pcb-viewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A React component for rendering interactive PCB layouts from [Circuit JSON](https://github.com/tscircuit/circuit-json). Part of the [tscircuit](https://github.com/tscircuit/tscircuit) ecosystem.

## Features

- Renders PCB layouts from Circuit JSON or tscircuit JSX elements
- Interactive pan and zoom
- Layer toggling (copper, silkscreen, courtyard, fabrication)
- Component highlighting and selection
- Trace and pad inspection
- Lightweight — no WebGL required

---

## Installation

```bash
npm install @tscircuit/pcb-viewer
# or
yarn add @tscircuit/pcb-viewer
# or
bun add @tscircuit/pcb-viewer
```

---

## Quick Start

### With tscircuit JSX elements

```tsx
import React from "react"
import { PCBViewer } from "@tscircuit/pcb-viewer"

export default () => (
  <div style={{ backgroundColor: "black", width: 800, height: 600 }}>
    <PCBViewer>
      <resistor name="R1" footprint="0805" resistance="10k" pcbX={0} pcbY={0} />
      <capacitor name="C1" footprint="0603" capacitance="100nF" pcbX={3} pcbY={0} />
      <trace from="R1.pin1" to="C1.pin1" />
    </PCBViewer>
  </div>
)
```

### With Circuit JSON data

If you already have Circuit JSON, pass it directly via the `circuitJson` prop:

```tsx
import React from "react"
import { PCBViewer } from "@tscircuit/pcb-viewer"

const circuitJson = [
  {
    type: "pcb_component",
    pcb_component_id: "R1",
    source_component_id: "source_R1",
    center: { x: 0, y: 0 },
    layer: "top",
    rotation: 0,
    width: 2,
    height: 1.2,
  },
  // ... more elements
]

export default () => (
  <div style={{ width: 800, height: 600 }}>
    <PCBViewer circuitJson={circuitJson} />
  </div>
)
```

---

## Props

### `PCBViewer`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `circuitJson` | `AnySoupElement[]` | `undefined` | Pre-built Circuit JSON array to render directly |
| `children` | `ReactNode` | `undefined` | tscircuit JSX elements (alternative to `circuitJson`) |
| `height` | `number` | `600` | Height of the viewer in pixels |
| `allowEditing` | `boolean` | `false` | Enable drag-to-move components (experimental) |
| `onError` | `(error: Error) => void` | `undefined` | Callback fired when rendering fails |
| `initialState` | `PCBViewerState` | `undefined` | Override initial pan/zoom/layer state |

---

## Usage Examples

### Displaying a single component

```tsx
import { PCBViewer } from "@tscircuit/pcb-viewer"

export default () => (
  <PCBViewer>
    <chip
      name="U1"
      footprint="soic8"
      pinLabels={{ pin1: "VCC", pin2: "GND", pin3: "IN", pin4: "OUT" }}
    />
  </PCBViewer>
)
```

### Full board with traces

```tsx
import { PCBViewer } from "@tscircuit/pcb-viewer"

export default () => (
  <PCBViewer>
    <board width="30mm" height="20mm">
      <chip name="U1" footprint="soic8" pcbX={0} pcbY={0} />
      <resistor name="R1" footprint="0402" resistance="10k" pcbX={8} pcbY={3} />
      <capacitor name="C1" footprint="0402" capacitance="100nF" pcbX={8} pcbY={-3} />
      <trace from="U1.pin1" to="R1.pin1" />
      <trace from="R1.pin2" to="C1.pin1" />
      <trace from="C1.pin2" to="net.GND" />
    </board>
  </PCBViewer>
)
```

### Read-only Circuit JSON viewer

```tsx
import { PCBViewer } from "@tscircuit/pcb-viewer"
import myCircuitJson from "./circuit.json"

export default () => (
  <div style={{ width: "100%", height: 500 }}>
    <PCBViewer circuitJson={myCircuitJson} />
  </div>
)
```

### With error handling

```tsx
import { PCBViewer } from "@tscircuit/pcb-viewer"

export default () => (
  <PCBViewer
    onError={(err) => {
      console.error("PCB render failed:", err)
    }}
  >
    <resistor name="R1" footprint="0402" resistance="1k" />
  </PCBViewer>
)
```

---

## Keyboard Shortcuts

When the viewer is focused:

| Key | Action |
|-----|--------|
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom to fit |
| Arrow keys | Pan the board |
| `F` | Fit board to view |

---

## Styling

The viewer renders on a dark background by default (matching typical PCB design tools). Wrap it in a container to control dimensions:

```tsx
<div style={{ width: "100%", maxWidth: 1200, height: 700, borderRadius: 8 }}>
  <PCBViewer circuitJson={json} />
</div>
```

---

## Troubleshooting

**Viewer renders blank / nothing visible**

- Confirm your Circuit JSON array is non-empty and contains valid `pcb_component` or `pcb_trace` elements.
- Make sure coordinates are in millimetres (base unit). Values like `x: 0.001` are likely in metres and will render off-screen.
- Check the browser console — `onError` also surfaces rendering errors.

**Components appear but no traces**

- Traces require both endpoints to resolve to valid pads. Check that `from` and `to` reference existing component pin labels.
- Use the [online Circuit JSON viewer](https://tscircuit.com) to inspect your JSON structure.

**Viewer is too small / too large**

- Pass a `height` prop (pixels) or control the container dimensions with CSS.
- Call the reset zoom shortcut (`0`) to fit the board to the viewport.

---

## Related Packages

| Package | Description |
|---------|-------------|
| [`@tscircuit/core`](https://github.com/tscircuit/core) | Compiles tscircuit JSX to Circuit JSON |
| [`@tscircuit/circuit-json`](https://github.com/tscircuit/circuit-json) | Circuit JSON type definitions and Zod schemas |
| [`@tscircuit/3d-viewer`](https://github.com/tscircuit/3d-viewer) | 3D PCB viewer (Three.js based) |
| [`@tscircuit/schematic-viewer`](https://github.com/tscircuit/schematic-viewer) | Schematic diagram viewer |
| [`@tscircuit/runframe`](https://github.com/tscircuit/runframe) | All-in-one runner with PCB, schematic, and 3D tabs |

---

## Contributing

Contributions are welcome! Please open an issue before submitting a PR for significant changes.

```bash
# Clone and install
git clone https://github.com/tscircuit/pcb-viewer.git
cd pcb-viewer
bun install

# Start Storybook for development
bun run storybook

# Run tests
bun test
```

---

## License

MIT © [tscircuit](https://github.com/tscircuit)
