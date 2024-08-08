# @tscircuit/pcb-viewer

[![npm version](https://badge.fury.io/js/@tscircuit%2Fpcb-viewer.svg)](https://badge.fury.io/js/@tscircuit%2Fpcb-viewer)

[Examples](https://pcb-viewer.vercel.app/) &middot; [TSCircuit](https://tscircuit.com) &middot; [Open in CodeSandbox](https://codesandbox.io/p/github/tscircuit/pcb-viewer)

Render Printed Circuit Boards w/ React

If you want to render to an image, check out [circuit-to-png](https://github.com/tscircuit/circuit-to-png)

![image](https://github.com/tscircuit/pcb-viewer/assets/1910070/e010f44e-b8c0-4e1d-9d59-1ea66716427f)

## Usage

```
npm install @tscircuit/pcb-viewer
```

```tsx
import React, { useEffect, useRef } from "react"
import { PCBViewer } from "@tscircuit/pcb-viewer"

export default () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer>
        <resistor footprint="0805" resistance="10k" />
      </PCBViewer>
    </div>
  )
}
```
