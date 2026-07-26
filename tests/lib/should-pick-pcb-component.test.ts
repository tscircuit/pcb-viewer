import { describe, expect, it } from "bun:test"
import { shouldPickPcbComponent } from "../../src/lib/should-pick-pcb-component"

describe("shouldPickPcbComponent", () => {
  it("allows a component on the selected side", () => {
    expect(
      shouldPickPcbComponent({ layer: "top" }, { selectedLayer: "top" }),
    ).toBe(true)
  })

  it("blocks a component on the non-selected side", () => {
    expect(
      shouldPickPcbComponent(
        { layer: "top" },
        {
          selectedLayer: "bottom",
        },
      ),
    ).toBe(false)
  })

  it("blocks hidden top-side components even when top is selected", () => {
    expect(
      shouldPickPcbComponent(
        { layer: "top" },
        {
          selectedLayer: "top",
          showTopComponents: false,
        },
      ),
    ).toBe(false)
  })

  it("blocks hidden bottom-side components even when bottom is selected", () => {
    expect(
      shouldPickPcbComponent(
        { layer: "bottom" },
        {
          selectedLayer: "bottom",
          showBottomComponents: false,
        },
      ),
    ).toBe(false)
  })

  it("keeps layerless components pickable regardless of side filters", () => {
    expect(
      shouldPickPcbComponent(
        { layer: undefined },
        {
          selectedLayer: "inner1",
          showTopComponents: false,
          showBottomComponents: false,
        },
      ),
    ).toBe(true)
  })
})
