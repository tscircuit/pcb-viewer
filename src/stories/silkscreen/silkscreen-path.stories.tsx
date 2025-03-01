import { type Meta } from "@storybook/react"
import type React from "react"
import { PCBViewer } from "../../PCBViewer"

export const SilkscreenPath: React.FC = () => {
  return (
    <PCBViewer>
      <board width="10mm" height="10mm">
        <chip
          name="U1"
          footprint={
            <footprint>
              <silkscreenpath
                layer="top"
                route={[
                  { x: 0, y: 0 },
                  { x: 1, y: 1 },
                  { x: 2, y: 1 },
                ]}
              />
            </footprint>
          }
        />
      </board>
    </PCBViewer>
  )
}

const meta: Meta<typeof SilkscreenPath> = {
  title: "Silkscreen",
  component: SilkscreenPath,
}

export default meta
