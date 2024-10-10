import { type Meta } from "@storybook/react";
import type React from "react";
import { PCBViewer } from "../../PCBViewer";

export const SilkscreenPath: React.FC = () => {
  return (
    <PCBViewer>
      <footprint>
        <silkscreenpath
          pcbX={0}
          pcbY={0}
          route={[
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 2, y: 1 },
          ]}
        />
      </footprint>
    </PCBViewer>
  );
};

const meta: Meta<typeof SilkscreenPath> = {
  title: "Silkscreen",
  component: SilkscreenPath,
};

export default meta;
