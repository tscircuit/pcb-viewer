# @tscircuit/pcb-viewer

Render PCBs w/ React

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
