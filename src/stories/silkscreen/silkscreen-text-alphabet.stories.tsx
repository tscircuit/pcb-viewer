import type { Meta } from "@storybook/react"
import { Circuit } from "@tscircuit/core"
import { svgAlphabet } from "assets/alphabet"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenTextAlphabet: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="20mm">
      <footprint>
        <silkscreentext
          text={Object.keys(svgAlphabet).join("")}
          pcbX={0}
          pcbY={0}
          anchorAlignment="bottom_left"
          fontSize={0.25}
          pcbRotation={0}
          layer="top"
        />
      </footprint>
    </board>,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={soup as any} />
    </div>
  )
}

export const SilkscreenTextFontSize = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={[
          {
            type: "pcb_board",
            center: { x: 0, y: 0 },
            width: 10,
            height: 10,
            subcircuit_id: "pcb_generic_component_0",
            material: "fr4",
            num_layers: 2,
            pcb_board_id: "pcb_board_0",
            thickness: 1,
            is_subcircuit: false,
          },
          {
            type: "pcb_silkscreen_text",
            layer: "top",
            pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
            font: "tscircuit2024",
            font_size: 1,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: 0 },
            anchor_alignment: "bottom_center",
            text: "FONT SIZE TEST",
          },
          {
            type: "pcb_silkscreen_text",
            layer: "top",
            pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
            font: "tscircuit2024",
            font_size: 0.5,
            pcb_component_id: "pcb_generic_component_0",
            anchor_position: { x: 0, y: 2 },
            anchor_alignment: "bottom_center",
            text: "FONT SIZE TEST",
          },
          {
            type: "pcb_smtpad",
            layer: "top",
            pcb_smtpad_id: "pcb_smtpad_0",
            pcb_component_id: "pcb_generic_component_0",
            width: 1,
            height: 1,
            x: 4.55,
            y: 0.5,
            shape: "rect",
          },
          {
            type: "pcb_smtpad",
            layer: "top",
            pcb_smtpad_id: "pcb_smtpad_0",
            pcb_component_id: "pcb_generic_component_0",
            width: 1,
            height: 1,
            x: -4.55,
            y: 0.5,
            shape: "rect",
          },
          {
            type: "pcb_smtpad",
            layer: "top",
            pcb_smtpad_id: "pcb_smtpad_0",
            pcb_component_id: "pcb_generic_component_0",
            width: 1,
            height: 1,
            x: -2.55,
            y: 2.5,
            shape: "rect",
          },
          {
            type: "pcb_smtpad",
            layer: "top",
            pcb_smtpad_id: "pcb_smtpad_0",
            pcb_component_id: "pcb_generic_component_0",
            width: 1,
            height: 1,
            x: 2.55,
            y: 2.5,
            shape: "rect",
          },
        ]}
      />
    </div>
  )
}

const meta: Meta<typeof SilkscreenTextAlphabet> = {
  title: "Silkscreen",
  component: SilkscreenTextAlphabet,
}

export default meta
