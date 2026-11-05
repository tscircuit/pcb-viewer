import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import React from "react"
import { scale } from "transformation-matrix"
import { GroupAnchorOffsetOverlay } from "../src/components/AnchorOffsetOverlay/GroupAnchorOffsetOverlay"
import { ContextProviders } from "../src/components/ContextProviders"

test("draws position offset when hovering over a component even when group anchor offset toggle is off", async () => {
  const { renderToStaticMarkup } = (await import(
    "react-dom/server" as string
  )) as {
    renderToStaticMarkup: (element: React.ReactElement) => string
  }

  const component = {
    type: "pcb_component" as const,
    pcb_component_id: "pcb_component_1",
    source_component_id: "source_component_1",
    center: { x: 6, y: 4 },
    width: 3,
    height: 1.5,
    layer: "top" as const,
    rotation: 0,
    pcb_group_id: "group_1",
    obstructs_within_bounds: true,
  }

  const pad = {
    type: "pcb_smtpad" as const,
    pcb_smtpad_id: "pad_1",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "port_1",
    shape: "rect" as const,
    x: 5,
    y: 4,
    width: 0.6,
    height: 1,
    layer: "top" as const,
  }

  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_group",
      pcb_group_id: "group_1",
      source_group_id: "source_group_1",
      name: "Group 1",
      center: { x: 2, y: 1 },
      width: 10,
      height: 8,
      anchor_alignment: "center",
      pcb_component_ids: ["pcb_component_1"],
    },
    component,
    pad,
  ]

  const html = renderToStaticMarkup(
    <ContextProviders initialState={{ is_showing_group_anchor_offsets: false }}>
      <GroupAnchorOffsetOverlay
        elements={elements}
        highlightedPrimitives={[
          {
            _element: pad,
            x: 5,
            y: 4,
            w: 0.6,
            h: 1,
            pcb_drawing_type: "rect",
          } as any,
        ]}
        transform={scale(20, 20)}
        containerWidth={800}
        containerHeight={600}
      />
    </ContextProviders>,
  )

  expect(html).toContain("<svg")
  expect(html).toContain("4.00mm")
  expect(html).toContain("3.00mm")
})

test("computes group anchor from anchor_alignment and normalizes display_offset suffixes on hover", async () => {
  const { renderToStaticMarkup } = (await import(
    "react-dom/server" as string
  )) as {
    renderToStaticMarkup: (element: React.ReactElement) => string
  }

  const component = {
    type: "pcb_component" as const,
    pcb_component_id: "pcb_component_2",
    source_component_id: "source_component_2",
    center: { x: -4, y: 6 },
    width: 2,
    height: 1.5,
    layer: "top" as const,
    rotation: 0,
    display_offset_x: "6.00mm",
    display_offset_y: "-4.00mm",
    obstructs_within_bounds: true,
  }

  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_group",
      pcb_group_id: "group_top_left",
      source_group_id: "source_group_top_left",
      name: "Top Left Group",
      center: { x: -5, y: 5 },
      width: 10,
      height: 10,
      anchor_alignment: "top_left",
      pcb_component_ids: ["pcb_component_2"],
    },
    component,
  ]

  const html = renderToStaticMarkup(
    <ContextProviders initialState={{ is_showing_group_anchor_offsets: false }}>
      <GroupAnchorOffsetOverlay
        elements={elements}
        highlightedPrimitives={[
          {
            _element: component,
            x: -4,
            y: 6,
            w: 2,
            h: 1.5,
            pcb_drawing_type: "rect",
          } as any,
        ]}
        transform={scale(20, 20)}
        containerWidth={800}
        containerHeight={600}
      />
    </ContextProviders>,
  )

  expect(html).toContain("6.00mm")
  expect(html).toContain("-4.00mm")
  expect(html).not.toContain("mmmm")
})
