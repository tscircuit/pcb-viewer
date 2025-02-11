import type { Meta, StoryObj } from "@storybook/react";
import { MobilePCBViewer } from "../components/MobilePCBViewer";

const meta: Meta<typeof MobilePCBViewer> = {
  title: "Mobile/PCBViewer",
  component: MobilePCBViewer,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
};

export default meta;
type Story = StoryObj<typeof MobilePCBViewer>;

export const Basic: Story = {
  args: {
    height: 400,
    enableTouchGestures: true,
    children: (
      <>
        <resistor footprint="0805" resistance="10k" />
        <capacitor footprint="0603" capacitance="100nF" />
      </>
    ),
  },
};

export const WithCircuitJson: Story = {
  args: {
    height: 400,
    circuitJson: [
      {
        type: "pcb_component",
        pcb_component_id: "R1",
        center: { x: 0, y: 0 },
      }
    ],
  },
};