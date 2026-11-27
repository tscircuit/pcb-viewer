import { expect, test } from "bun:test"
import { getErrorPortPoints } from "../../src/lib/util/error-preview"

const portsById = new Map<string, any>([
  ["port-a", { x: 1, y: 2 }],
  ["port-b", { x: 5, y: 6 }],
  ["port-broken", { x: "far" }],
])

test("returns port positions when the error has an explicit center", () => {
  expect(
    getErrorPortPoints(
      {
        center: { x: 3, y: 4 },
        pcb_port_ids: ["port-a", "port-b"],
      },
      portsById,
    ),
  ).toEqual([
    { x: 1, y: 2 },
    { x: 5, y: 6 },
  ])
})

test("skips unknown ports and non-numeric coordinates", () => {
  expect(
    getErrorPortPoints(
      {
        center: { x: 3, y: 4 },
        pcb_port_ids: ["port-a", "missing", "port-broken"],
      },
      portsById,
    ),
  ).toEqual([{ x: 1, y: 2 }])
})

test("returns nothing without an explicit center", () => {
  expect(
    getErrorPortPoints({ pcb_port_ids: ["port-a", "port-b"] }, portsById),
  ).toEqual([])
  expect(getErrorPortPoints({}, portsById)).toEqual([])
  expect(getErrorPortPoints(null, portsById)).toEqual([])
})
