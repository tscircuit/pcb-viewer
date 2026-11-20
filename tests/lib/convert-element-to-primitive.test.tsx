import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"

test("interpolated trace polygons stay on their painted layer and break at through-pad transitions", () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={12} height={8}>
      <pcbtrace
        route={[
          { route_type: "wire", x: -3, y: 0, width: 0.6, layer: "top" },
          { route_type: "wire", x: -2, y: 0, width: 0.2, layer: "top" },
          {
            route_type: "through_pad",
            start: { x: -1, y: 0 },
            end: { x: 1, y: 0 },
            width: 0.6,
            start_layer: "top",
            end_layer: "bottom",
          },
          { route_type: "wire", x: 2, y: 0, width: 0.2, layer: "bottom" },
          { route_type: "wire", x: 3, y: 0, width: 0.6, layer: "bottom" },
        ]}
      />
      <pcbtrace
        route={[
          {
            route_type: "wire",
            x: 0,
            y: 2,
            width: 0.9,
            start_width: 0.9,
            end_width: 0.15,
            width_interpolation_mode: "linear",
            layer: "top",
          },
          { route_type: "wire", x: 2, y: 2, width: 0.15, layer: "top" },
        ]}
      />
    </board>,
  )
  circuit.render()
  const [trace, taper] = circuit.db.pcb_trace.list()
  // Core does not expose the legacy trace-wide interpolation flag on pcbtrace.
  circuit.db.pcb_trace.update(trace.pcb_trace_id, {
    route_thickness_mode: "interpolated",
  })
  const primitives = convertElementToPrimitives(trace, [trace])
  expect(primitives).toHaveLength(2)
  const [top, bottom] = primitives
  expect(top).toMatchObject({
    layer: "top",
    pcb_drawing_type: "polygon",
    points: [
      { x: -3, y: 0.3 },
      { x: -2, y: 0.1 },
      { x: -2, y: -0.1 },
      { x: -3, y: -0.3 },
    ],
  })
  expect(bottom).toMatchObject({
    layer: "bottom",
    pcb_drawing_type: "polygon",
    points: [
      { x: 2, y: 0.1 },
      { x: 3, y: 0.3 },
      { x: 3, y: -0.3 },
      { x: 2, y: -0.1 },
    ],
  })
  const taperPrimitives = convertElementToPrimitives(taper, [taper])
  expect(taperPrimitives).toHaveLength(1)
  expect(taperPrimitives[0]).toMatchObject({
    layer: "top",
    pcb_drawing_type: "polygon",
    points: [
      { x: 0, y: 2.45 },
      { x: 2, y: 2.075 },
      { x: 2, y: 1.925 },
      { x: 0, y: 1.55 },
    ],
  })
})
