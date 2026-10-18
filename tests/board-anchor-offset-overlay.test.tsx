import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import React from "react"
import { identity, scale } from "transformation-matrix"
import { BoardAnchorOffsetOverlay } from "../src/components/AnchorOffsetOverlay/BoardAnchorOffsetOverlay"
import { PanelAnchorOffsetOverlay } from "../src/components/AnchorOffsetOverlay/PanelAnchorOffsetOverlay"
import { ContextProviders } from "../src/components/ContextProviders"

test("renders board and panel anchor offsets without duplicate mm units", async () => {
  const { renderToStaticMarkup } = (await import(
    "react-dom/server" as string
  )) as {
    renderToStaticMarkup: (element: React.ReactElement) => string
  }

  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "pcb_panel_0",
      width: 80,
      height: 60,
      center: { x: 40, y: 30 },
      thickness: 1.6,
      covered_with_solder_mask: false,
    },
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      pcb_panel_id: "pcb_panel_0",
      center: { x: 20, y: 15 },
      anchor_position: { x: 18, y: 12 },
      width: 40,
      height: 20,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
      position_mode: "relative_to_panel_anchor",
      display_offset_x: "-20mm",
      display_offset_y: "-15mm",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      center: { x: 28, y: 22 },
      width: 4,
      height: 2,
      layer: "top",
      rotation: 0,
      positioned_relative_to_pcb_board_id: "pcb_board_0",
      obstructs_within_bounds: true,
    },
  ]

  const html = renderToStaticMarkup(
    <ContextProviders initialState={{ is_showing_group_anchor_offsets: true }}>
      <PanelAnchorOffsetOverlay
        elements={elements}
        highlightedPrimitives={[]}
        transform={scale(10, 10)}
        containerWidth={800}
        containerHeight={600}
      />
      <BoardAnchorOffsetOverlay
        elements={elements}
        highlightedPrimitives={[]}
        transform={scale(10, 10)}
        containerWidth={800}
        containerHeight={600}
      />
    </ContextProviders>,
  )

  expect(html).toContain("-20mm")
  expect(html).toContain("-15mm")
  expect(html).not.toContain("mmmm")
  expect(html).toContain("10.00mm")
})

test("shows panel-to-board offset when hovering a component on that board", async () => {
  const { renderToStaticMarkup } = (await import(
    "react-dom/server" as string
  )) as {
    renderToStaticMarkup: (element: React.ReactElement) => string
  }

  const board = {
    type: "pcb_board" as const,
    pcb_board_id: "pcb_board_0",
    pcb_panel_id: "pcb_panel_0",
    center: { x: 20, y: 15 },
    width: 40,
    height: 20,
    material: "fr4" as const,
    num_layers: 2,
    thickness: 1.6,
  }
  const component = {
    type: "pcb_component" as const,
    pcb_component_id: "pcb_component_0",
    source_component_id: "source_component_0",
    center: { x: 25, y: 18 },
    width: 4,
    height: 2,
    layer: "top" as const,
    rotation: 0,
    positioned_relative_to_pcb_board_id: "pcb_board_0",
    obstructs_within_bounds: true,
  }
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "pcb_panel_0",
      width: 80,
      height: 60,
      center: { x: 40, y: 30 },
      thickness: 1.6,
      covered_with_solder_mask: false,
    },
    board,
    component,
  ]

  const html = renderToStaticMarkup(
    <ContextProviders initialState={{ is_showing_group_anchor_offsets: false }}>
      <PanelAnchorOffsetOverlay
        elements={elements}
        highlightedPrimitives={[
          {
            _element: component,
            x: 25,
            y: 18,
            w: 4,
            h: 2,
            pcb_drawing_type: "rect",
          } as any,
        ]}
        transform={identity()}
        containerWidth={800}
        containerHeight={600}
      />
    </ContextProviders>,
  )

  expect(html).toContain("<svg")
})
