# Native rendering benchmark

This exercises the complete AM3352 fixture through the real CanvasPrimitiveRenderer, using native canvas and React's test renderer. The grid is omitted. Results measure renderer and highlight-metadata CPU time; they are not browser FPS or whole-app latency.

Install the optional benchmark dependencies in a disposable checkout, then run:

```sh
npm install --no-save --package-lock=false @napi-rs/canvas@1.0.9 react-test-renderer@19.1.0
bun benchmarks/rendering.tsx
```

Run the same harness in the base and proposed checkouts to compare. The base checkout must include the AM3352 fixture. `basePrimitives` is ignored by older renderer versions.

Workloads:

- `pan_highlight`: 40 movements of 5px while switching the highlighted trace.
- `hover_highlight`: 40 trace highlight changes without moving the camera.
- `large_net_pan`: 12 movements while cycling the three largest actual nets.
- `zoom_highlight`: 40 zoom/highlight changes from 3 to 6.9 pixels/mm.

The viewport is 1000 × 600. The report includes initial render, median, 95th percentile, maximum, total update time, and cleared canvas-layer count. Highlight metadata calculation is inside each timed update. Use `WORKLOAD=hover_highlight` to select a workload, `RESULT_PATH=results.json` to save results, or `SAVE_IMAGES=1` to save composites.

Native compositing can differ from a browser's Canvas2D implementation. Browser interaction and visual verification are separate checks.
