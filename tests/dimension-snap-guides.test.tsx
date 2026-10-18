import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { DimensionSnapGuides } from "../src/components/DimensionSnapGuides"

test("renders a large guide set as two paths with only selected markers highlighted", () => {
  const points = Array.from({ length: 70_043 }, (_, index) => ({
    id: String(index),
    screenPoint: { x: index, y: index + 10 },
  }))
  const html = renderToStaticMarkup(
    <DimensionSnapGuides points={points} startId="0" endId="70042" />,
  )
  expect(html.match(/<svg/g)).toHaveLength(1)
  expect(html.match(/<path/g)).toHaveLength(2)
  expect(html).toContain(
    'd="M-2.5,7.5l5,5m0,-5l-5,5M70039.5,70049.5l5,5m0,-5l-5,5" stroke="#66ccff"',
  )
})

test("handles coincident endpoints and stale selections after geometry changes", () => {
  const points = [{ id: "a", screenPoint: { x: 10, y: 20 } }]
  const same = renderToStaticMarkup(
    <DimensionSnapGuides points={points} startId="a" endId="a" />,
  )
  expect(same).toContain('d="M7.5,17.5l5,5m0,-5l-5,5" stroke="#66ccff"')
  const stale = renderToStaticMarkup(
    <DimensionSnapGuides points={[]} startId="a" endId={null} />,
  )
  expect(stale).toContain('d="" stroke="#66ccff"')
})

test("DimensionOverlay sticks completed dimension arrows when creating multiple measurements and clears on Escape", async () => {
  const { JSDOM } = await import("jsdom")
  const { act } = await import("react")
  const { createRoot } = await import("react-dom/client")
  const { DimensionOverlay } = await import(
    "../src/components/DimensionOverlay"
  )
  const { useGlobalStore } = await import("../src/global-store")

  const dom = new JSDOM('<div id="root"></div>')
  const prevWindow = globalThis.window
  const prevDocument = globalThis.document
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const root = createRoot(dom.window.document.getElementById("root")!)
  try {
    useGlobalStore.getState().setIsMouseOverContainer(true)
    await act(async () => {
      root.render(
        <DimensionOverlay>
          <div style={{ width: 200, height: 200 }} />
        </DimensionOverlay>,
      )
    })

    const viewer = dom.window.document.querySelector(
      "[data-pcb-viewer]",
    ) as HTMLElement
    expect(viewer).not.toBeNull()

    // Start first dimension arrow via 'd'
    await act(async () => {
      viewer.dispatchEvent(
        new dom.window.MouseEvent("mousemove", {
          bubbles: true,
          clientX: 10,
          clientY: 10,
        }),
      )
      dom.window.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", { key: "d", bubbles: true }),
      )
    })

    // Stretch first dimension arrow and click to complete
    await act(async () => {
      viewer.dispatchEvent(
        new dom.window.MouseEvent("mousemove", {
          bubbles: true,
          clientX: 50,
          clientY: 40,
        }),
      )
    })
    await act(async () => {
      viewer.dispatchEvent(
        new dom.window.MouseEvent("mousedown", {
          bubbles: true,
          clientX: 50,
          clientY: 40,
        }),
      )
    })

    // Start a second dimension arrow via 'd' — first should become a sticky arrow
    await act(async () => {
      viewer.dispatchEvent(
        new dom.window.MouseEvent("mousemove", {
          bubbles: true,
          clientX: 80,
          clientY: 80,
        }),
      )
      dom.window.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", { key: "d", bubbles: true }),
      )
    })

    const stickyArrows = dom.window.document.querySelectorAll(
      "[data-dimension-arrow]",
    )
    expect(stickyArrows).toHaveLength(1)

    // Escape clears both active and sticky dimension arrows
    await act(async () => {
      dom.window.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
        }),
      )
    })

    expect(
      dom.window.document.querySelectorAll("[data-dimension-arrow]"),
    ).toHaveLength(0)
  } finally {
    await act(async () => root.unmount())
    Object.assign(globalThis, {
      window: prevWindow,
      document: prevDocument,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
