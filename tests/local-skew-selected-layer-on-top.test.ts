import { expect, test } from "bun:test"
import { renderPairBoard } from "./fixtures/local-skew/pair-board"
import { openOverlayPage } from "./local-skew-overlay/open-overlay-page"

test("each layer's overlay is stacked with its copper, the selected layer in front", async () => {
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
      .locator(".pcb-local-skew-overlay svg[data-layer]")
      .evaluateAll((overlays) =>
        overlays.map((overlay) => {
          const layer = overlay.getAttribute("data-layer")
          const canvas = document.querySelector(
            `.pcb-layer-${layer}`,
          ) as HTMLElement
          return {
            layer,
            opacity: overlay.getAttribute("opacity"),
            zIndex: Number((overlay as SVGSVGElement).style.zIndex),
            copperZIndex: Number(canvas.style.zIndex),
          }
        }),
      )
    // Each overlay shares its copper canvas's z-index and comes later in
    // the page, so it paints just above that copper and below any layer in
    // front, including the selected top copper over the faded bottom.
    const byLayer = Object.fromEntries(
      layers.map((entry) => [entry.layer, entry]),
    )
    expect(byLayer.top.opacity).toBe("1")
    expect(byLayer.bottom.opacity).toBe("0.5")
    for (const entry of layers) expect(entry.zIndex).toBe(entry.copperZIndex)
    expect(byLayer.top.zIndex).toBeGreaterThan(byLayer.bottom.zIndex)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
