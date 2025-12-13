import type React from "react"
import type { AnyCircuitElement, PcbCopperPour } from "circuit-json"
import { PCBViewer } from "../../PCBViewer"

export const CopperPour: React.FC = () => {
  const soup: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board1",
      center: { x: 0, y: 0 },
      width: 200,
      height: 100,
      material: "fr4",
      num_layers: 2,
      thickness: 1.6,
    },
    // pour_brep_1: square with rounded-square hole
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_brep_1",
      layer: "top",
      shape: "brep",
      source_net_id: "net1",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: -30, y: 30 },
            { x: -50, y: 30 },
            { x: -50, y: 10 },
            { x: -30, y: 10 },
          ],
        },
        inner_rings: [
          {
            vertices: [
              { x: -35, y: 25, bulge: 0.5 },
              { x: -45, y: 25 },
              { x: -45, y: 15 },
              { x: -35, y: 15 },
            ],
          },
        ],
      },
    } as PcbCopperPour,
    // pour_brep_2: Bulgy outer ring, two holes
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_brep_2",
      layer: "top",
      shape: "brep",
      source_net_id: "net2",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: 10, y: 30, bulge: -0.5 },
            { x: -10, y: 30 },
            { x: -10, y: 10, bulge: 0.5 },
            { x: 10, y: 10 },
          ],
        },
        inner_rings: [
          {
            // square hole
            vertices: [
              { x: -5, y: 25 },
              { x: -8, y: 25 },
              { x: -8, y: 22 },
              { x: -5, y: 22 },
            ],
          },
          {
            // triangular hole
            vertices: [
              { x: 5, y: 25 },
              { x: 8, y: 22 },
              { x: 5, y: 22 },
            ],
          },
        ],
      },
    } as PcbCopperPour,
    // pour_brep_3: Circular pour with square hole
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_brep_3",
      layer: "top",
      shape: "brep",
      source_net_id: "net3",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: 30, y: 20, bulge: 1 },
            { x: 50, y: 20, bulge: 1 },
          ],
        },
        inner_rings: [
          {
            vertices: [
              { x: 38, y: 22 },
              { x: 42, y: 22 },
              { x: 42, y: 18 },
              { x: 38, y: 18 },
            ],
          },
        ],
      },
    } as PcbCopperPour,
    // pour_brep_4: bottom layer pour
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_brep_4",
      layer: "bottom",
      shape: "brep",
      source_net_id: "net4",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: -30, y: -10 },
            { x: -50, y: -10 },
            { x: -50, y: -30 },
            { x: -30, y: -30, bulge: 0.5 },
          ],
        },
      },
    } as PcbCopperPour,
    // pour_rect_1: A rect pour with rotation
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_rect_1",
      layer: "top",
      shape: "rect",
      source_net_id: "net5",
      center: { x: 0, y: -20 },
      width: 20,
      height: 10,
      rotation: 15,
    } as PcbCopperPour,
    // pour_polygon_1: A polygon pour (triangle)
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour_polygon_1",
      layer: "top",
      shape: "polygon",
      source_net_id: "net6",
      points: [
        { x: 30, y: -10 },
        { x: 50, y: -30 },
        { x: 30, y: -30 },
      ],
    } as PcbCopperPour,
  ]

  return (
    <div style={{ backgroundColor: "black", width: "100%", height: "400px" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export default CopperPour
