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
- `initialState`: Initial state for the viewer

### Features

- Interactive PCB viewing with pan and zoom
- Multiple layer support (top, bottom, inner layers)
- Component placement editing
- Trace routing
- DRC (Design Rule Check) visualization
- Measurement tools
