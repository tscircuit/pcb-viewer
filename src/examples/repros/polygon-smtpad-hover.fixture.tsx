import type { CSSProperties } from "react"
import { PCBViewer } from "../../PCBViewer"

const polygonPad = (
  points: { x: number; y: number }[],
  id: string,
  portHint: string,
) => ({
  type: "pcb_smtpad" as const,
  pcb_smtpad_id: id,
  pcb_component_id: "comp", // keep everything in a single component
  pcb_port_id: id,
  layer: "top" as const,
  shape: "polygon" as const,
  points,
  port_hints: [portHint],
})

const rectPad = (
  id: string,
  portHint: string,
  overrides: Partial<{
    x: number
    y: number
    width: number
    height: number
  }> = {},
) => ({
  type: "pcb_smtpad" as const,
  pcb_smtpad_id: id,
  pcb_component_id: "comp",
  pcb_port_id: id,
  layer: "top" as const,
  shape: "rect" as const,
  x: 0,
  y: 0,
  width: 0.5,
  height: 0.5,
  port_hints: [portHint],
  ...overrides,
})

const elements = [
  {
    type: "pcb_board" as const,
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    thickness: 1.4,
    num_layers: 2,
    width: 4,
    height: 4,
    outline: undefined,
    material: "fr4",
  },
  rectPad("rectPad", "pin_rect", { x: 1.5 }),
  polygonPad(
    [
      { x: -0.2, y: -0.47 },
      { x: -0.59, y: -0.47 },
      { x: -0.59, y: -0.17 },
      { x: -0.41, y: -0.17 },
      { x: -0.2, y: -0.35 },
    ],
    "polygonPad",
    "pin_poly",
  ),
]

const description = `
Reproduction fixture for a bug where hovering or zooming after interacting
with a rectangular SMT pad caused neighbouring polygon pads to expand.
The regression was triggered by the shared canvas stroke state being
reused when polygons were rendered with a zero width stroke.
`

const styles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  backgroundColor: "black",
  padding: 16,
}

export const PolygonSmtPadHoverBug = () => {
  return (
    <div style={styles}>
      <p style={{ color: "white", maxWidth: 400 }}>{description}</p>
      <PCBViewer circuitJson={elements as any} />
    </div>
  )
}

export default PolygonSmtPadHoverBug
