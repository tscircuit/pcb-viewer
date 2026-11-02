import type { AnyCircuitElement } from "circuit-json"
import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../src/index"
import { getPaintedBoardBounds } from "../viewport-framing/get-painted-board-bounds"

type AnimationFrameId = number
const pendingFrames = new Map<AnimationFrameId, FrameRequestCallback>()
let animationFrameId = 0

// Hold the fitted camera until the hook's external-update render has finished,
// matching a fit committed by the demo on the following animation frame.
window.requestAnimationFrame = (callback) => {
  pendingFrames.set(++animationFrameId, callback)
  return animationFrameId
}
window.cancelAnimationFrame = (frameId) => {
  pendingFrames.delete(frameId)
}

function flushFrame() {
  const callbacks = [...pendingFrames.values()]
  pendingFrames.clear()
  for (const callback of callbacks) callback(performance.now())
}

const response = await fetch("/fixtures/tmds62levm-full-board.circuit.json.gz")
const compressedBytes = await response.arrayBuffer()
const signature = new Uint8Array(compressedBytes)
const circuitJson: AnyCircuitElement[] =
  signature[0] === 0x1f && signature[1] === 0x8b
    ? await new Response(
        new Blob([compressedBytes])
          .stream()
          .pipeThrough(new DecompressionStream("gzip")),
      ).json()
    : JSON.parse(new TextDecoder().decode(compressedBytes))
const firstZoomTest = {
  elementCount: circuitJson.length,
  pendingFrameCount: () => pendingFrames.size,
  flushFrame,
  getPaintedBoardBounds,
}
declare global {
  interface Window {
    pcbFirstZoomTest: typeof firstZoomTest
  }
}
window.pcbFirstZoomTest = firstZoomTest

createRoot(document.getElementById("root")!).render(
  <PCBViewer circuitJson={circuitJson} renderer="canvas" height={600} />,
)
