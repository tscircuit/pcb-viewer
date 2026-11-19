import { expect, test } from "bun:test"
import { openOverlayPage } from "./local-skew-overlay/open-overlay-page"

test("the overlay hides with its layer when hidden layers are set to Hide", async () => {
  // The pair is on the top layer; viewing the bottom with hidden layers at 0.
  const { page, errors, close } = await openOverlayPage({
    is_showing_local_skew: true,
    selected_layer: "bottom",
    hidden_layer_opacity: 0,
  })
  try {
    await page.locator(".pcb-local-skew-overlay").waitFor()
    expect(await page.locator(".pcb-local-skew-overlay line").count()).toBe(0)
    expect(errors).toEqual([])
  } finally {
    await close()
  }
}, 60000)
