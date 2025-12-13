import { Circuit } from "@tscircuit/core"
import type React from "react"
import { PCBViewer } from "../../../../PCBViewer"
import { usePICO_W } from "../../../../assets/usePICO"
import { useHS91L02W2C01 } from "../../../../assets/useHS91L02W2C01"
import { WS2812B_2020 as LedWithIc } from "../../../../assets/useWS2812B_2020"

export const contributionBoard: React.FC = () => {
  const circuit = new Circuit()
  type Point = { x: number; y: number }

  type GridCellPositions = {
    index: number
    center: Point
    topLeft: Point
    bottomRight: Point
  }

  type GridOptions = {
    rows: number
    cols: number
    xSpacing?: number
    ySpacing?: number
    width?: number
    height?: number
    offsetX?: number
    offsetY?: number
    yDirection?: "cartesian" | "up-is-negative"
  }

  // ToDO import from tscircuit utils in the future
  function grid({
    rows,
    cols,
    xSpacing,
    ySpacing,
    width,
    height,
    offsetX = 0,
    offsetY = 0,
    yDirection = "cartesian",
  }: GridOptions): GridCellPositions[] {
    // Calculate cell dimensions
    const cellWidth = width ? width / cols : (xSpacing ?? 1)
    const cellHeight = height ? height / rows : (ySpacing ?? 1)

    const cells: GridCellPositions[] = []

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col

        // Calculate center position
        const centerX = offsetX + col * cellWidth + cellWidth / 2
        const rawCenterY = offsetY + row * cellHeight + cellHeight / 2

        // Adjust Y coordinate based on yDirection
        const centerY =
          yDirection === "cartesian"
            ? offsetY + (rows - 1 - row) * cellHeight + cellHeight / 2
            : rawCenterY

        cells.push({
          row,
          col,
          index,
          center: { x: centerX, y: centerY },
          topLeft: {
            x: centerX - cellWidth / 2,
            y: centerY + cellHeight / 2,
          },
          bottomRight: {
            x: centerX + cellWidth / 2,
            y: centerY - cellHeight / 2,
          },
        } as any)
      }
    }

    return cells
  }

  const U1 = usePICO_W("U1")
  const U2 = useHS91L02W2C01("U2")
  circuit.add(
    <board width="316mm" height="52mm" routingDisabled>
      <U1 pcbRotation="90deg" pcbX={-122 - 15} pcbY={0} />
      <U2
        GND="net.GND"
        VCC={"net.V5"}
        SDA={U1.GP26_ADC0_I2C1SDA}
        SCL={U1.GP27_ADC1_I2C1SCL}
        schX={-7}
        schY={0}
        pcbX={-122 + 5}
        pcbY={19}
      />
      {grid({
        cols: 53,
        rows: 7,
        xSpacing: 5,
        ySpacing: 5,
        offsetX: 3 - 122,
        offsetY: -32 / 2 - 7.5,
      }).map(({ center, index }) => {
        const ledName = `LED${index + 1}`
        const prevLedName = index > 0 ? `LED${index}` : null
        const capName = `C_${ledName}`
        const ledSchX = ((center.x / 2) * 8) / 5 + 2 + 101
        const ledSchY = 5 + center.y / 1.5
        return (
          <>
            <LedWithIc
              schX={ledSchX}
              schY={ledSchY}
              name={ledName}
              pcbX={center.x}
              pcbY={center.y}
            />
            <trace from={`.${ledName} .GND`} to="net.GND" />
            <trace from={`.${ledName} .VDD`} to="net.V5" />
            {prevLedName && (
              <trace from={`.${prevLedName} .DO`} to={`.${ledName} .DI`} />
            )}
            <capacitor
              name={capName}
              footprint="0402"
              capacitance="100nF"
              pcbX={center.x}
              pcbY={center.y - 2.2}
              pcbRotation="180deg"
              schX={ledSchX}
              schY={ledSchY - 1.1}
              schRotation="180deg"
            />
            <trace from={`.${capName} .neg`} to="net.GND" />
            <trace from={`.${capName} .pos`} to="net.V5" />
          </>
        )
      })}

      <capacitor
        name="C1"
        capacitance="100uF"
        footprint="1206"
        schX={5}
        pcbX={-122}
        pcbRotation="90deg"
        schRotation="270deg"
      />
      <trace from=".C1 .neg" to="net.GND" />
      <trace from=".C1 .pos" to="net.V5" />

      <trace from=".LED1 .DI" to={U1.GP11_SPI1TX_I2C1SCL} />
      <trace from={U1.GND1} to="net.GND" />
      <trace from={U1.GND2} to="net.GND" />
      <trace from={U1.GND3} to="net.GND" />
      <trace from={U1.GND4} to="net.GND" />
      <trace from={U1.GND5} to="net.GND" />
      <trace from={U1.GND6} to="net.GND" />
      <trace from={U1.GND7} to="net.GND" />

      <trace from={U1.VBUS} to="net.V5" />
      <footprint>
        <hole pcbX={-32 - 122} pcbY={20} diameter="4.8mm" />
        <hole pcbX={-32 - 122} pcbY={-20} diameter="4.8mm" />
        <hole pcbX={32 + 122} pcbY={20} diameter="4.8mm" />
        <hole pcbX={32 + 122} pcbY={-20} diameter="4.8mm" />
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

export default contributionBoard
