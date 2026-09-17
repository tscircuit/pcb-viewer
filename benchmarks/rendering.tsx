// @ts-nocheck
// Optional native benchmark dependencies: see benchmarks/README.md.
import { mock } from "bun:test"
import React from "react"
import { act, create } from "react-test-renderer"
import { createCanvas, Path2D } from "@napi-rs/canvas"
import { writeFileSync } from "node:fs"
mock.module("react-supergrid", () => ({
  SuperGrid: () => null,
  toMMSI: String,
}))
;(globalThis as any).Path2D = Path2D
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
const { convertElementToPrimitives } = await import(
  "../src/lib/convert-element-to-primitive"
)
const { getFullConnectivityMapFromCircuitJson } = await import(
  "../node_modules/circuit-json-to-connectivity-map"
)
const elements = (
  await import("../src/examples/2026/repros/am3352-dev-board/circuit.json")
).default as any[]
const primitives = elements.flatMap((e) =>
  convertElementToPrimitives(e, elements),
)
const nets = Object.values(
  getFullConnectivityMapFromCircuitJson(elements).netMap,
).sort((a: any, b: any) => b.length - a.length) as string[][]
const traceIds = elements
  .filter((e) => e.type === "pcb_trace")
  .slice(0, 40)
  .map((e) => e.pcb_trace_id)
const initial = { a: 5, b: 0, c: 0, d: -5, e: 500, f: 300 }
const records: any[] = []
for (const directory of ["current"]) {
  const { CanvasPrimitiveRenderer: Renderer } = await import(
    `../src/components/CanvasPrimitiveRenderer`
  )
  const { StoreContext } = await import(`../src/components/ContextProviders`)
  const { createStore } = await import(`../src/global-store`)
  const { addInteractionMetadataToPrimitives: addMetadata } = await import(
    `../src/lib/util/addInteractionMetadataToPrimitives`
  )
  for (const workload of process.env.WORKLOAD
    ? [process.env.WORKLOAD]
    : ["pan_highlight", "hover_highlight", "large_net_pan", "zoom_highlight"]) {
    const store = createStore(),
      canvases = new Map<string, any>()
    let clears = 0
    const nodeMock = (element: any) => {
      if (element.type !== "canvas") return null
      const key = element.props.className
      if (canvases.has(key)) return canvases.get(key)
      const canvas = createCanvas(
        element.props.width,
        element.props.height,
      ) as any
      canvas.style = {}
      canvas.ownerDocument = { createElement: () => createCanvas(1, 1) }
      const ctx = canvas.getContext("2d"),
        clear = ctx.clearRect.bind(ctx)
      ctx.clearRect = (...args: any[]) => {
        clears++
        clear(...args)
      }
      canvases.set(key, canvas)
      return canvas
    }
    const render = (transform: any, ids: string[]) => (
      <StoreContext.Provider value={store as any}>
        <Renderer
          elements={elements}
          primitives={addMetadata({
            primitivesWithoutInteractionMetadata: primitives,
            drawingObjectIdsWithMouseOver: new Set(),
            primitiveIdsInMousedOverNet: ids,
          })}
          basePrimitives={primitives}
          transform={transform}
          width={1000}
          height={600}
        />
      </StoreContext.Provider>
    )
    let root: any
    const t0 = performance.now()
    await act(() => {
      root = create(render(initial, []), { createNodeMock: nodeMock })
    })
    const mountMs = performance.now() - t0
    clears = 0
    const durations: number[] = []
    const count = workload === "large_net_pan" ? 12 : 40
    for (let i = 0; i < count; i++) {
      const transform = { ...initial }
      if (workload.endsWith("pan") || workload === "pan_highlight")
        transform.e += (i + 1) * 5
      if (workload === "zoom_highlight") {
        transform.a = 3 + i / 10
        transform.d = -transform.a
      }
      const ids = workload === "large_net_pan" ? nets[i % 3] : [traceIds[i]]
      const t = performance.now()
      await act(() => root.update(render(transform, ids)))
      durations.push(performance.now() - t)
    }
    const composite = createCanvas(1000, 600),
      ctx = composite.getContext("2d")
    for (const canvas of [...canvases.values()].sort(
      (a, b) => Number(a.style.zIndex) - Number(b.style.zIndex),
    )) {
      if (canvas.style.display === "none") continue
      ctx.globalAlpha = Number(canvas.style.opacity || 1)
      const match = canvas.style.transform?.match(
        /translate\(([-.\d]+)px, ([-.\d]+)px\)/,
      )
      const margin = (canvas.width - 1000) / 2
      ctx.drawImage(
        canvas,
        (match ? Number(match[1]) : 0) - margin,
        (match ? Number(match[2]) : 0) - margin,
      )
    }
    if (process.env.SAVE_IMAGES)
      writeFileSync(
        `render-${directory}-${workload}.png`,
        composite.toBuffer("image/png"),
      )
    const sorted = [...durations].sort((a, b) => a - b)
    const record = {
      directory,
      workload,
      mountMs,
      updates: count,
      medianMs: sorted[Math.floor(count / 2)],
      p95Ms: sorted[Math.floor(count * 0.95)],
      maxMs: Math.max(...durations),
      totalMs: durations.reduce((a, b) => a + b, 0),
      layerClears: clears,
    }
    records.push(record)
    console.log(JSON.stringify(record))
    await act(() => root.unmount())
  }
}
if (process.env.RESULT_PATH)
  writeFileSync(process.env.RESULT_PATH, JSON.stringify({ records }, null, 2))
