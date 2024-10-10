import type { Meta } from "@storybook/react";
import { Circuit } from "@tscircuit/core";
import type React from "react";
import { PCBViewer } from "../../PCBViewer";

export const SilkscreenRect: React.FC = () => {
  const circuit = new Circuit();

  circuit.add(
    <board width="10mm" height="10mm">
      <footprint>
        <silkscreenrect pcbX={0} pcbY={0} width={"0.5mm"} height={"0.5mm"} />
      </footprint>
    </board>
  );

  const soup = circuit.getCircuitJson();

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer soup={soup} />
    </div>
  );
};

const meta: Meta<typeof SilkscreenRect> = {
  title: "Silkscreen",
  component: SilkscreenRect,
};

export default meta;
