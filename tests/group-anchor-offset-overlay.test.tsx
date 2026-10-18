import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import React from "react"
import { scale } from "transformation-matrix"
import { GroupAnchorOffsetOverlay } from "../src/components/AnchorOffsetOverlay/GroupAnchorOffsetOverlay"
import { ContextProviders } from "../src/components/ContextProviders"

test("GroupAnchorOffsetOverlay renders group-to-group anchor offsets when position_mode is relative_to_pcb_group", async () => {
  const { renderToStaticMarkup } = (await import(
    "react-dom/server" as string
  )) as {
    renderToStaticMarkup: (element: React.ReactElement) => string
  }

  const elements = [
    {
      type: "pcb_group",
      pcb_group_id: "group_parent",
      source_group_id: "src_group_parent",
      name: "Parent Group",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      pcb_component_ids: [],
    },
    {
      type: "pcb_group",
      pcb_group_id: "group_child",
      source_group_id: "src_group_child",
      name: "Child Group",
      center: { x: 15, y: -10 },
      width: 8,
      height: 8,
      anchor_position: { x: 15, y: -10 },
      anchor_alignment: "center",
      position_mode: "relative_to_pcb_group",
      positioned_relative_to_pcb_group_id: "group_parent",
      display_offset_x: "15.00",
      display_offset_y: "-10.00",
      pcb_component_ids: ["comp_child_1"],
    },
    {
      type: "pcb_component",
      pcb_component_id: "comp_child_1",
      source_component_id: "src_comp_child_1",
      center: { x: 15, y: -10 },
      width: 2,
      height: 2,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: true,
      pcb_group_id: "group_child",
    },
  ] as AnyCircuitElement[]

  const markup = renderToStaticMarkup(
    <ContextProviders initialState={{ is_showing_group_anchor_offsets: true }}>
      <GroupAnchorOffsetOverlay
        elements={elements}
        highlightedPrimitives={[]}
        transform={scale(10)}
        containerWidth={800}
        containerHeight={600}
      />
    </ContextProviders>,
  )

  expect(markup).toContain("15.00mm")
  expect(markup).toContain("-10.00mm")

  // Also verify hover traversal on a component in the relative_to_pcb_group child group
  const hoveredMarkup = renderToStaticMarkup(
    <ContextProviders initialState={{ is_showing_group_anchor_offsets: false }}>
      <GroupAnchorOffsetOverlay
        elements={elements}
        highlightedPrimitives={[
          {
            _element: elements[2],
          } as any,
        ]}
        transform={scale(10)}
        containerWidth={800}
        containerHeight={600}
      />
    </ContextProviders>,
  )

  expect(hoveredMarkup).toContain("15.00mm")
  expect(hoveredMarkup).toContain("-10.00mm")
})
