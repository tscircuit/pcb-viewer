import { describe, it, expect } from "bun:test"
import { CanvasPrimitiveRenderer } from "../../src/components/CanvasPrimitiveRenderer"
import { createRoot } from "react-dom/client"
import React from "react"
import { ContextProviders } from "../../src/components/ContextProviders"

describe("CanvasPrimitiveRenderer", () => {
  it("should render a canvas", (done) => {
    const rootEl = document.createElement("div")
    document.body.appendChild(rootEl)
    const root = createRoot(rootEl)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          const canvas = rootEl.querySelector("canvas")
          if (canvas) {
            expect(canvas).not.toBeNull()
            observer.disconnect()
            done()
          }
        }
      }
    })

    observer.observe(rootEl, { childList: true, subtree: true })

    root.render(
      React.createElement(
        ContextProviders,
        null,
        React.createElement(CanvasPrimitiveRenderer, {
          primitives: [
            {
              _pcb_drawing_object_id: "line_0",
              pcb_drawing_type: "line",
              x1: -25,
              y1: -25,
              x2: 25,
              y2: -25,
              width: 1,
              zoomIndependent: true,
              layer: "board",
              _element: {
                type: "pcb_board",
                pcb_board_id: "pcb_board_0",
                center: {
                  x: 0,
                  y: 0,
                },
                thickness: 1.4,
                num_layers: 2,
                width: 50,
                height: 50,
                material: "fr4",
              },
              is_in_highlighted_net: false,
              is_mouse_over: false,
            },
          ],
        })
      )
    )
  })
})
