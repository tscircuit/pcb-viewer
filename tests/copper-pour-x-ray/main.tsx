import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../src/index"
import type { AnyCircuitElement } from "circuit-json"

const params = new URLSearchParams(location.search)
const scene: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 40,
    height: 30,
    num_layers: 4,
    thickness: 1.6,
    material: "fr4",
  },
  ...["GND", "VCC"].map((name) => ({
    type: "source_net" as const,
    source_net_id: name,
    name,
    member_source_group_ids: [],
  })),
  {
    type: "source_trace",
    source_trace_id: "trace_gnd",
    connected_source_net_ids: ["GND"],
    connected_source_port_ids: [],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace",
    source_trace_id: "trace_gnd",
    route: [
      { route_type: "wire", x: -12, y: -8, width: 0.5, layer: "top" },
      { route_type: "wire", x: -8, y: -8, width: 0.5, layer: "top" },
    ],
  },
  ...["top", "inner1", "bottom"].map((layer) => ({
    type: "pcb_copper_pour" as const,
    pcb_copper_pour_id: `rect_${layer}`,
    source_net_id: layer === "inner1" ? "VCC" : "GND",
    layer: layer as "top" | "inner1" | "bottom",
    shape: "rect" as const,
    center: { x: -10, y: layer === "bottom" ? -2 : 6 },
    width: 6,
    height: 4,
    covered_with_solder_mask: false,
  })),
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "polygon",
    source_net_id: "GND",
    layer: "top",
    shape: "polygon",
    points: [
      { x: 6, y: 4 },
      { x: 12, y: 4 },
      { x: 6, y: 8 },
    ],
    covered_with_solder_mask: false,
  },
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "rotated",
    source_net_id: "GND",
    layer: "top",
    shape: "rect",
    center: { x: 10, y: -8 },
    width: 8,
    height: 2,
    rotation: 90,
    covered_with_solder_mask: false,
  },
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "brep",
    source_net_id: "GND",
    layer: "top",
    shape: "brep",
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -3, y: 3 },
          { x: 3, y: 3 },
          { x: 3, y: -3 },
          { x: -3, y: -3 },
        ],
      },
      inner_rings: [
        {
          vertices: [
            { x: -1, y: -1 },
            { x: 1, y: -1 },
            { x: 1, y: 1 },
            { x: -1, y: 1 },
          ],
        },
      ],
    },
    covered_with_solder_mask: false,
  },
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "arc",
    source_net_id: "GND",
    layer: "top",
    shape: "brep",
    brep_shape: {
      outer_ring: {
        vertices: [
          { x: -2, y: 10, bulge: 1 },
          { x: 2, y: 10, bulge: 1 },
        ],
      },
      inner_rings: [],
    },
    covered_with_solder_mask: false,
  },
]
localStorage.setItem(
  "pcb_viewer_copper_pour_opacity",
  params.has("transparent") ? "0" : "1",
)
localStorage.setItem("pcb_viewer_hidden_layer_opacity", "0")
createRoot(document.getElementById("root")!).render(
  <PCBViewer
    circuitJson={scene}
    renderer={params.has("gpu") ? "webgpu" : "canvas"}
    height={600}
    initialState={{
      is_showing_solder_mask: false,
      is_showing_copper_pours: !params.has("hidden"),
    }}
  />,
)
