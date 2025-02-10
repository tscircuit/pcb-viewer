# @tscircuit/pcb-viewer

[![npm version](https://badge.fury.io/js/@tscircuit%2Fpcb-viewer.svg)](https://badge.fury.io/js/@tscircuit%2Fpcb-viewer)

[Examples](https://pcb-viewer.vercel.app/) &middot; [TSCircuit](https://tscircuit.com) &middot; 

##  ☁ Open in the Cloud 
[![Open in VS Code](https://img.shields.io/badge/Open%20in-VS%20Code-blue?logo=visualstudiocode)](https://vscode.dev/github/tscircuit/pcb-viewer)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/tscircuit/pcb-viewer)
[![Open in CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/embed/react-markdown-preview-co1mj?fontsize=14&hidenavigation=1&theme=dark)
[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/tscircuit/pcb-viewer)
[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/tscircuit/pcb-viewer?template=node&title=ngx-vcard%20Example)
[![Open in Repl.it](https://replit.com/badge/github/withastro/astro)](https://replit.com/github/tscircuit/pcb-viewer)
[![Open in Glitch](https://img.shields.io/badge/Open%20in-Glitch-blue?logo=glitch)](https://glitch.com/edit/#!/import/github/tscircuit/pcb-viewer)
[![Open in Codeanywhere](https://codeanywhere.com/img/open-in-codeanywhere-btn.svg)](https://app.codeanywhere.com/#https://github.com/tscircuit/pcb-viewer)


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
