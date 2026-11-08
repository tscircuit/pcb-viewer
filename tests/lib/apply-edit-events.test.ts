import { expect, test } from "bun:test"
import type { CircuitJson, PcbComponent } from "circuit-json"
import {
  applyEditEvents,
  getSelectablePcbGroupForComponent,
} from "../../src/lib/apply-edit-events"

const circuitJson: CircuitJson = [
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_0",
    source_component_id: "source_component_0",
    center: { x: 0, y: 0 },
    width: 2,
    height: 1,
    rotation: 0,
    layer: "top",
    obstructs_within_bounds: true,
  },
]

test("circuit json is reused when there are no edit events", () => {
  expect(applyEditEvents({ circuitJson, editEvents: [] })).toBe(circuitJson)
})

test("circuit json is cloned before applying edit events", () => {
  const editedCircuitJson = applyEditEvents({
    circuitJson,
    editEvents: [
      {
        edit_event_id: "edit_event_0",
        edit_event_type: "edit_pcb_component_location",
        pcb_edit_event_type: "edit_component_location",
        created_at: 0,
        pcb_component_id: "pcb_component_0",
        original_center: { x: 0, y: 0 },
        new_center: { x: 4, y: 5 },
      },
    ],
  })

  expect(editedCircuitJson).not.toBe(circuitJson)
  expect(editedCircuitJson[0]).toMatchObject({ center: { x: 4, y: 5 } })
  expect(circuitJson[0]).toMatchObject({ center: { x: 0, y: 0 } })
})

test("edit_pcb_group_location moves group, nested groups, member components, and primitives together", () => {
  const groupCircuitJson: CircuitJson = [
    {
      type: "source_group",
      source_group_id: "source_group_board",
      name: "board_root",
    },
    {
      type: "source_board",
      source_board_id: "source_board_0",
      source_group_id: "source_group_board",
    },
    {
      type: "source_group",
      source_group_id: "source_group_1",
      name: "G1",
      parent_source_group_id: "source_group_board",
    },
    {
      type: "source_group",
      source_group_id: "source_group_nested",
      name: "G1_nested",
      parent_source_group_id: "source_group_1",
    },
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 20,
      height: 20,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    {
      type: "pcb_group",
      pcb_group_id: "pcb_group_1",
      source_group_id: "source_group_1",
      name: "G1",
      center: { x: 2, y: 3 },
      anchor_position: { x: 2, y: 3 },
      anchor_alignment: "center",
      width: 6,
      height: 4,
      pcb_component_ids: ["pcb_component_1", "pcb_component_2"],
    },
    {
      type: "pcb_group",
      pcb_group_id: "pcb_group_nested",
      source_group_id: "source_group_nested",
      name: "G1_nested",
      center: { x: 3, y: 4 },
      anchor_alignment: "center",
      width: 2,
      height: 2,
      pcb_component_ids: ["pcb_component_nested"],
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      pcb_group_id: "pcb_group_1",
      center: { x: 1, y: 3 },
      width: 2,
      height: 1,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_1",
      pcb_component_id: "pcb_component_1",
      shape: "rect",
      layer: "top",
      x: 0.5,
      y: 3,
      width: 0.6,
      height: 0.6,
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_2",
      source_component_id: "source_component_2",
      pcb_group_id: "pcb_group_1",
      center: { x: 3, y: 3 },
      width: 2,
      height: 1,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_nested",
      source_component_id: "source_component_nested",
      pcb_group_id: "pcb_group_nested",
      center: { x: 3, y: 4 },
      width: 1,
      height: 1,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_outside",
      source_component_id: "source_component_outside",
      center: { x: -5, y: -5 },
      width: 2,
      height: 1,
      rotation: 0,
      layer: "top",
      obstructs_within_bounds: true,
    },
  ]

  const edited = applyEditEvents({
    circuitJson: groupCircuitJson,
    editEvents: [
      {
        edit_event_id: "edit_group_0",
        edit_event_type: "edit_pcb_group_location",
        created_at: 0,
        pcb_group_id: "pcb_group_1",
        original_center: { x: 2, y: 3 },
        new_center: { x: 7, y: -1 },
      },
    ],
  })

  const editedGroup = edited.find(
    (el) => el.type === "pcb_group" && el.pcb_group_id === "pcb_group_1",
  )
  const editedNestedGroup = edited.find(
    (el) => el.type === "pcb_group" && el.pcb_group_id === "pcb_group_nested",
  )
  const editedComp1 = edited.find(
    (el) =>
      el.type === "pcb_component" && el.pcb_component_id === "pcb_component_1",
  )
  const editedPad1 = edited.find(
    (el) => el.type === "pcb_smtpad" && el.pcb_smtpad_id === "pcb_smtpad_1",
  )
  const editedComp2 = edited.find(
    (el) =>
      el.type === "pcb_component" && el.pcb_component_id === "pcb_component_2",
  )
  const editedCompNested = edited.find(
    (el) =>
      el.type === "pcb_component" &&
      el.pcb_component_id === "pcb_component_nested",
  )
  const editedCompOutside = edited.find(
    (el) =>
      el.type === "pcb_component" &&
      el.pcb_component_id === "pcb_component_outside",
  )

  expect(editedGroup).toMatchObject({
    center: { x: 7, y: -1 },
    anchor_position: { x: 7, y: -1 },
  })
  expect(editedNestedGroup).toMatchObject({
    center: { x: 8, y: 0 },
  })
  expect(editedComp1).toMatchObject({ center: { x: 6, y: -1 } })
  expect(editedPad1).toMatchObject({ x: 5.5, y: -1 })
  expect(editedComp2).toMatchObject({ center: { x: 8, y: -1 } })
  expect(editedCompNested).toMatchObject({ center: { x: 8, y: 0 } })
  expect(editedCompOutside).toMatchObject({ center: { x: -5, y: -5 } })
})

test("getSelectablePcbGroupForComponent selects child group on board and ignores root/board groups", () => {
  const compInBoardGroup: PcbComponent = {
    type: "pcb_component",
    pcb_component_id: "pcb_component_in_group",
    source_component_id: "source_component_in_group",
    pcb_group_id: "pcb_group_child",
    center: { x: 1, y: 2 },
    width: 2,
    height: 1,
    rotation: 0,
    layer: "top",
    obstructs_within_bounds: true,
  }
  const compDirectlyOnBoard: PcbComponent = {
    type: "pcb_component",
    pcb_component_id: "pcb_component_on_board",
    source_component_id: "source_component_on_board",
    center: { x: -2, y: -3 },
    width: 2,
    height: 1,
    rotation: 0,
    layer: "top",
    obstructs_within_bounds: true,
  }

  const boardWithGroupCircuit: CircuitJson = [
    {
      type: "source_group",
      source_group_id: "source_group_board",
      name: "board",
    },
    {
      type: "source_board",
      source_board_id: "source_board_0",
      source_group_id: "source_group_board",
    },
    {
      type: "source_group",
      source_group_id: "source_group_child",
      name: "G1",
      parent_source_group_id: "source_group_board",
    },
    {
      type: "source_component",
      source_component_id: "source_component_on_board",
      source_group_id: "source_group_board",
      name: "C1",
      ftype: "simple_capacitor",
      capacitance: 100,
    },
    {
      type: "pcb_group",
      pcb_group_id: "pcb_group_child",
      source_group_id: "source_group_child",
      name: "G1",
      center: { x: 1, y: 2 },
      anchor_alignment: "center",
      width: 4,
      height: 4,
      pcb_component_ids: ["pcb_component_in_group"],
    },
    compInBoardGroup,
    compDirectlyOnBoard,
  ]

  expect(
    getSelectablePcbGroupForComponent({
      circuitJson: boardWithGroupCircuit,
      pcbComponent: compInBoardGroup,
    })?.pcb_group_id,
  ).toBe("pcb_group_child")

  expect(
    getSelectablePcbGroupForComponent({
      circuitJson: boardWithGroupCircuit,
      pcbComponent: compDirectlyOnBoard,
    }),
  ).toBeNull()

  const rootGroupWithoutParentCircuit: CircuitJson = [
    {
      type: "source_group",
      source_group_id: "source_group_root",
      name: "root_group",
    },
    {
      type: "pcb_group",
      pcb_group_id: "pcb_group_root",
      source_group_id: "source_group_root",
      name: "root_group",
      center: { x: 0, y: 0 },
      anchor_alignment: "center",
      width: 10,
      height: 10,
      pcb_component_ids: ["pcb_component_in_group"],
    },
    {
      ...compInBoardGroup,
      pcb_group_id: "pcb_group_root",
    },
  ]

  expect(
    getSelectablePcbGroupForComponent({
      circuitJson: rootGroupWithoutParentCircuit,
      pcbComponent: {
        ...compInBoardGroup,
        pcb_group_id: "pcb_group_root",
      },
    }),
  ).toBeNull()
})
