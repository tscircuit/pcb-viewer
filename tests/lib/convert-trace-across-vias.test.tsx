import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"

test("convertElementToPrimitives does not bridge wire segments across vias or layer changes", () => {
  const start = {
    route_type: "wire",
    x: -12,
    y: 0,
    width: 0.15,
    layer: "top",
  } as const
  const end = {
    route_type: "wire",
    x: 12,
    y: 0,
    width: 0.15,
    layer: "top",
  } as const
  const down = {
    route_type: "via",
    x: -6,
    y: 0,
    from_layer: "top",
    to_layer: "bottom",
  } as const
  const up = {
    route_type: "via",
    x: 6,
    y: 0,
    from_layer: "bottom",
    to_layer: "top",
  } as const

  const circuit = new Circuit()
  circuit.add(
    <board width={30} height={10}>
      <pcbtrace
        route={[
          start,
          { ...start, x: down.x },
          down,
          { ...start, x: down.x, layer: "bottom" },
          { ...start, x: up.x, layer: "bottom" },
          up,
          { ...end, x: up.x },
          end,
        ]}
      />
      <pcbtrace route={[start, down, up, end]} />
      <pcbtrace
        route={[
          { ...start, y: 2 },
          { ...end, y: 2, layer: "bottom" },
        ]}
      />
    </board>,
  )
  const elements = circuit.getCircuitJson()
  const [trace, bareViaTrace, layerChangeTrace] = elements.filter(
    (element) => element.type === "pcb_trace",
  )

  const lines = convertElementToPrimitives(trace, elements)
  expect(lines).toMatchObject([
    { pcb_drawing_type: "line", x1: -12, x2: -6, layer: "top" },
    { pcb_drawing_type: "line", x1: -6, x2: 6, layer: "bottom" },
    { pcb_drawing_type: "line", x1: 6, x2: 12, layer: "top" },
  ])
  expect(convertElementToPrimitives(bareViaTrace, elements)).toEqual([])
  expect(convertElementToPrimitives(layerChangeTrace, elements)).toEqual([])
})
