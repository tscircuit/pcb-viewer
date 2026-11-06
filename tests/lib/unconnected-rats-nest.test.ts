import { expect, test } from "bun:test"
import "bun-match-svg"
import type { AnyCircuitElement } from "circuit-json"
import { getRatsNestLines } from "../../src/components/RatsNestOverlay"
import { LAYER_NAME_TO_COLOR } from "../../src/lib/Drawer"
import colors from "../../src/lib/colors"
import { convertElementToPrimitives } from "../../src/lib/convert-element-to-primitive"

test("unconnected rats nest omits routed connections and keeps remaining airwires", async () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0.5, y: 0.5 },
      width: 8,
      height: 5,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "source_port",
      source_port_id: "source_port_1",
      source_component_id: "source_component_1",
      name: "1",
      pin_number: 1,
    },
    {
      type: "source_port",
      source_port_id: "source_port_2",
      source_component_id: "source_component_2",
      name: "1",
      pin_number: 1,
    },
    {
      type: "source_port",
      source_port_id: "source_port_3",
      source_component_id: "source_component_3",
      name: "1",
      pin_number: 1,
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_1",
      connected_source_port_ids: [
        "source_port_1",
        "source_port_2",
        "source_port_3",
      ],
      connected_source_net_ids: ["source_net_1"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      source_port_id: "source_port_1",
      pcb_component_id: "pcb_component_1",
      x: -2,
      y: 0,
      layers: ["top"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_2",
      source_port_id: "source_port_2",
      pcb_component_id: "pcb_component_2",
      x: 0,
      y: 0,
      layers: ["top"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_3",
      source_port_id: "source_port_3",
      pcb_component_id: "pcb_component_3",
      x: 3,
      y: 1.2,
      layers: ["top"],
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_1",
      pcb_port_id: "pcb_port_1",
      pcb_component_id: "pcb_component_1",
      shape: "rect",
      x: -2,
      y: 0,
      width: 0.8,
      height: 0.8,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_2",
      pcb_port_id: "pcb_port_2",
      pcb_component_id: "pcb_component_2",
      shape: "rect",
      x: 0,
      y: 0,
      width: 0.8,
      height: 0.8,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pcb_smtpad_3",
      pcb_port_id: "pcb_port_3",
      pcb_component_id: "pcb_component_3",
      shape: "rect",
      x: 3,
      y: 1.2,
      width: 0.8,
      height: 0.8,
      layer: "top",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_1",
      source_trace_id: "source_trace_1",
      route: [
        {
          route_type: "wire",
          x: -2,
          y: 0,
          width: 0.25,
          layer: "top",
          start_pcb_port_id: "pcb_port_1",
        },
        {
          route_type: "wire",
          x: 0,
          y: 0,
          width: 0.25,
          layer: "top",
          end_pcb_port_id: "pcb_port_2",
        },
      ],
    },
  ]

  const allLines = getRatsNestLines({ soup, onlyUnconnected: false })
  expect(allLines).toHaveLength(3)

  const unconnectedLines = getRatsNestLines({ soup, onlyUnconnected: true })
  expect(unconnectedLines).toHaveLength(1)
  expect(unconnectedLines[0]).toMatchObject({
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 3, y: 1.2 },
    isInNet: true,
  })

  const fullyRoutedSoup: AnyCircuitElement[] = [
    ...soup,
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_2",
      source_trace_id: "source_trace_1",
      route: [
        {
          route_type: "wire",
          x: 0,
          y: 0,
          width: 0.25,
          layer: "top",
          start_pcb_port_id: "pcb_port_2",
        },
        {
          route_type: "wire",
          x: 3,
          y: 1.2,
          width: 0.25,
          layer: "top",
          end_pcb_port_id: "pcb_port_3",
        },
      ],
    },
  ]
  expect(
    getRatsNestLines({ soup: fullyRoutedSoup, onlyUnconnected: true }),
  ).toEqual([])

  const primitives = soup.flatMap((el) => convertElementToPrimitives(el, soup))
  const padAndTraceSvg = primitives
    .map((p) => {
      if (p.pcb_drawing_type === "rect" && p.layer === "top") {
        return `<rect x="${p.x - p.w / 2}" y="${p.y - p.h / 2}" width="${p.w}" height="${p.h}" fill="${LAYER_NAME_TO_COLOR.top}"/>`
      }
      if (p.pcb_drawing_type === "line" && p.layer === "top") {
        return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${LAYER_NAME_TO_COLOR.top}" stroke-width="${p.width}" stroke-linecap="round"/>`
      }
      return ""
    })
    .filter(Boolean)
    .join("\n    ")

  const ratsNestSvg = unconnectedLines
    .map(
      (line) =>
        `<line x1="${line.startPoint.x}" y1="${line.startPoint.y}" x2="${line.endPoint.x}" y2="${line.endPoint.y}" stroke="white" stroke-width="0.1" stroke-dasharray="0.25 0.2" opacity="0.85"/>`,
    )
    .join("\n    ")

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="-3.5 -2 8 5">
  <title>Unconnected rats nest shows only remaining airwires</title>
  <rect x="-3.5" y="-2" width="8" height="5" fill="${colors.board.background}"/>
  <g transform="scale(1 -1)">
    ${padAndTraceSvg}
    ${ratsNestSvg}
  </g>
</svg>`

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
