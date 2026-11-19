import { expect, test } from "bun:test"
import { renderPairBoard } from "./fixtures/local-skew/pair-board"
import { openOverlayPage } from "./local-skew-overlay/open-overlay-page"

test("the selected layer's overlay is drawn above the faded layers", async () => {
  // Both traces hop to the bottom layer in the middle of the board.
  const { page, errors, close } = await openOverlayPage({
    initialState: {
      is_showing_local_skew: true,
      selected_layer: "top",
      hidden_layer_opacity: 0.5,
    },
    circuitJson: renderPairBoard({
      positivePath: [
        { x: 6, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
        { x: 18, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
      ],
      negativePath: [
        { x: 6, y: 0, via: true, fromLayer: "top", toLayer: "bottom" },
        { x: 18, y: 0, via: true, fromLayer: "bottom", toLayer: "top" },
      ],
      pcbTraceGap: "0.45mm",
    }),
  })
  try {
    await page.locator(".pcb-local-skew-overlay").waitFor()
    const layers = await page
      .locator(".pcb-local-skew-overlay g[data-layer]")
      .evaluateAll((groups) =>
        groups.map((group) => [
          group.getAttribute("data-layer"),
          group.getAttribute("opacity"),
        ]),
      )
    // The pair is drawn top-layer first along the route, yet the selected
    // top layer is moved last so it paints over the faded bottom stretch.
    expect(layers).toEqual([
      ["bottom", "0.5"],
      ["top", "1"],
    ])
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
