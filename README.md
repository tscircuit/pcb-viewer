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

There are two primary ways to provide circuit data to `PCBViewer`:

### 1. Using Circuit Components with `@tscircuit/core`

To declaratively define your circuit using React components, use `@tscircuit/core` to build the circuit and extract Circuit JSON:

```bash
npm install @tscircuit/core
```

```tsx
import React, { useMemo } from "react"
import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "@tscircuit/pcb-viewer"

export default () => {
  const circuitJson = useMemo(() => {
    const circuit = new Circuit()
    circuit.add(
      <board width="20mm" height="20mm">
        <resistor footprint="0805" resistance="10k" name="R1" />
        <capacitor footprint="0603" capacitance="100nF" name="C1" />
      </board>,
    )
    return circuit.getCircuitJson()
  }, [])

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}
```

### 2. Using Circuit JSON Directly

If you already have Circuit JSON elements (from `@tscircuit/core`, an API, or a saved file), pass them directly via `circuitJson`:

```tsx
import React from "react"
import { PCBViewer } from "@tscircuit/pcb-viewer"
import type { AnyCircuitElement } from "circuit-json"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_component",
    pcb_component_id: "R1",
    center: { x: 0, y: 0 },
    width: 2,
    height: 1.25,
    layer: "top",
    rotation: 0,
    source_component_id: "source_R1",
  },
  // ... other circuit elements
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

The `PCBViewer` component accepts the following props:

| Prop | Type | Default | Description |
|---|---|---|---|
| `circuitJson` | `AnyCircuitElement[]` | `undefined` | Array of Circuit JSON elements representing the PCB layout, traces, pads, holes, and components. |
| `height` | `number` | `600` | Height of the viewer canvas container in pixels. |
| `allowEditing` | `boolean` | `true` | Enables or disables component placement editing. |
| `editEvents` | `ManualEditEvent[]` | `[]` | Controlled array of manual edit events to apply to component placements. |
| `onEditEventsChanged` | `(editEvents: ManualEditEvent[]) => void` | `undefined` | Callback fired when component placement edit events are created or updated. |
| `onBoundsSelected` | `(bounds: BoundsSelection) => void` | `undefined` | Callback fired when the Bounds tool finishes selecting a bounding rectangle (`{ minX, minY, maxX, maxY }`). |
| `initialState` | `Partial<StateProps>` | `undefined` | Initial view state options (e.g. toggles for solder mask, copper pours, PCB notes, or layer visibility). |
| `focusOnHover` | `boolean` | `false` | Enables automatic canvas focus on mouse hover for immediate keyboard and mouse interactions. |
| `clickToInteractEnabled` | `boolean` | `false` | When enabled, displays a "Click to Interact" / "Touch to Interact" overlay preventing page scroll capture until clicked. |
| `debugGraphics` | `GraphicsObject \| null` | `null` | Optional debug graphics overlay (e.g. autorouting lines, routing obstacles, and debug points). |
| `disablePcbGroups` | `boolean` | `false` | Disables rendering and selection overlays for PCB group containers. |

### Features

- **Interactive Canvas**: High-performance WebGL rendering via PixiJS with smooth panning and zooming.
- **Multi-Layer Rendering**: Top/bottom copper, inner layers, silkscreen text/shapes, solder mask, and drill holes.
- **Net Connectivity Inspection**: Hover over any trace, pad, or net to highlight connected traces across layers.
- **Component Placement Editing**: Interactive footprint dragging and rotation with edit event tracking (`onEditEventsChanged`).
- **DRC & Warning Overlays**: Real-time Design Rule Check (DRC) visual indicators and connector orientation warnings.
- **Measurement & Bounding Tools**: Interactive dimension line tools and rectangle bounds selection (`onBoundsSelected`).
- **PCB Groups**: Hierarchy visualization and group anchor offset indicators.
- **Autorouter Debugging**: Visualize autorouting graph nodes, obstacles, and debug paths via `debugGraphics`.
