import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../PCBViewer"
import { AnyCircuitElement } from "circuit-json"

export const AllFeaturesExample = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="120mm" height="80mm">
      <copperpour layer="top" connectsTo="net.GND" clearance="0.25mm" />
      <copperpour layer="bottom" connectsTo="net.GND" clearance="0.25mm" />

      <pcbnotetext
        pcbX="-45mm"
        pcbY="36mm"
        layer="top"
        text="ALL FEATURES (PCB NOTES)"
        font="tscircuit2024"
        fontSize="3mm"
      />
      <pcbnotetext
        pcbX="-45mm"
        pcbY="32mm"
        layer="bottom"
        text="BOTTOM PCB NOTES"
        font="tscircuit2024"
        fontSize="2mm"
      />

      <silkscreentext
        pcbX="-15mm"
        pcbY="36mm"
        layer="top"
        text="silkscreen text"
        font="tscircuit2024"
        fontSize="2mm"
      />
      <silkscreenrect
        pcbX="-50mm"
        pcbY="22mm"
        layer="top"
        width="10mm"
        height="6mm"
        filled={false}
        stroke="dashed"
        strokeWidth="0.2mm"
        cornerRadius="0.6mm"
      />
      <silkscreencircle
        pcbX="-35mm"
        pcbY="22mm"
        layer="top"
        radius="3mm"
        isOutline
        strokeWidth="0.2mm"
      />
      <silkscreenline
        layer="top"
        x1="-55mm"
        y1="16mm"
        x2="-30mm"
        y2="16mm"
        strokeWidth="0.2mm"
      />
      <silkscreenpath
        layer="top"
        route={[
          { x: "-55mm", y: "10mm" },
          { x: "-42mm", y: "8mm" },
          { x: "-30mm", y: "10mm" },
        ]}
        strokeWidth="0.2mm"
      />

      <keepout
        pcbX="-45mm"
        pcbY="-12mm"
        shape="rect"
        width="14mm"
        height="10mm"
      />
      <keepout pcbX="-28mm" pcbY="-12mm" shape="circle" radius="6mm" />

      <cutout
        pcbX="45mm"
        pcbY="-12mm"
        shape="rect"
        width="16mm"
        height="10mm"
      />
      <cutout pcbX="30mm" pcbY="-12mm" shape="circle" radius="6mm" />
      <cutout
        shape="polygon"
        points={[
          { x: 52, y: -2 },
          { x: 40, y: -2 },
          { x: 46, y: 6 },
        ]}
      />

      <via
        pcbX="40mm"
        pcbY="22mm"
        holeDiameter="0.5mm"
        outerDiameter="1mm"
        fromLayer="top"
        toLayer="bottom"
        connectsTo="net.SIG"
        name="VIA_SIG"
      />
      <hole pcbX="52mm" pcbY="22mm" diameter="2.4mm" />
      <platedhole
        pcbX="52mm"
        pcbY="30mm"
        shape="circle"
        holeDiameter="1.2mm"
        outerDiameter="2.4mm"
        connectsTo="net.GND"
      />
      <group name="Grouped Section" pcbX="-5mm" pcbY="-20mm">
        <resistor
          name="RG1"
          pcbX="0mm"
          pcbY="0mm"
          pcbRelative
          footprint="0603"
          resistance="1k"
        />
        <resistor
          name="RG2"
          pcbX="3mm"
          pcbY="0mm"
          pcbRelative
          footprint="0603"
          resistance="2k"
        />
      </group>

      <resistor
        name="R1"
        pcbX="-10mm"
        pcbY="0mm"
        footprint="0805"
        resistance="10k"
      />
      <capacitor
        name="C1"
        pcbX="10mm"
        pcbY="0mm"
        footprint="0805"
        capacitance="1uF"
      />
      <led name="LED1" pcbX="30mm" pcbY="0mm" footprint="0603" />
      <chip
        name="U1"
        pcbX="0mm"
        pcbY="20mm"
        footprint={
          <footprint>
            <silkscreenrect
              pcbX="0mm"
              pcbY="0mm"
              layer="top"
              width="14mm"
              height="10mm"
              filled={false}
              stroke="solid"
              strokeWidth="0.15mm"
              cornerRadius="1mm"
            />
            <silkscreentext
              pcbX="0mm"
              pcbY="6mm"
              layer="top"
              text="U1"
              font="tscircuit2024"
              fontSize="2mm"
            />

            <smtpad
              shape="rect"
              pcbX="-5mm"
              pcbY="0mm"
              width="2.2mm"
              height="1.2mm"
              layer="top"
              portHints={["1", "left"]}
              coveredWithSolderMask
              solderMaskMargin="0.2mm"
            />
            <smtpad
              shape="rect"
              pcbX="5mm"
              pcbY="0mm"
              width="2.2mm"
              height="1.2mm"
              layer="top"
              portHints={["2", "right"]}
            />
            <hole pcbX="0mm" pcbY="-4mm" diameter="1.4mm" />

            <fabricationnoterect
              pcbX="0mm"
              pcbY="0mm"
              layer="top"
              width="14mm"
              height="10mm"
              strokeWidth="0.1mm"
              isFilled={false}
              hasStroke
              color="rgba(0, 255, 255, 0.7)"
            />
            <fabricationnotepath
              layer="top"
              strokeWidth="0.1mm"
              route={[
                { x: "-7mm", y: "-5mm" },
                { x: "7mm", y: "5mm" },
              ]}
            />
            <fabricationnotetext
              pcbX="0mm"
              pcbY="-7mm"
              layer="top"
              text="FAB"
              font="tscircuit2024"
              fontSize="1.5mm"
            />

            <pcbnotetext
              pcbX="0mm"
              pcbY="-2.5mm"
              layer="top"
              text="NOTE"
              font="tscircuit2024"
              fontSize="1.5mm"
            />
          </footprint>
        }
      />

      <fabricationnotedimension
        layer="top"
        from={{ x: -55, y: 38 }}
        to={{ x: 55, y: 38 }}
        text="120mm board width"
        font="tscircuit2024"
        fontSize="1.2mm"
        arrowSize="1mm"
        color="rgba(255, 255, 0, 0.9)"
      />

      <pcbnoterect
        pcbX="0mm"
        pcbY="-32mm"
        layer="top"
        width="40mm"
        height="10mm"
        strokeWidth="0.2mm"
        isFilled={false}
        hasStroke
        color="rgba(255, 165, 0, 0.9)"
        cornerRadius="1mm"
      />
      <pcbnotetext
        pcbX="0mm"
        pcbY="-32mm"
        layer="top"
        text="PCB NOTE AREA"
        font="tscircuit2024"
        fontSize="2mm"
      />
      <pcbnoteline
        layer="top"
        x1="-20mm"
        y1="-36mm"
        x2="20mm"
        y2="-36mm"
        strokeWidth="0.2mm"
        isDashed
        color="rgba(255, 165, 0, 0.9)"
      />
      <pcbnotepath
        layer="top"
        strokeWidth="0.2mm"
        color="rgba(255, 165, 0, 0.9)"
        route={[
          { x: "-20mm", y: "-28mm" },
          { x: "0mm", y: "-24mm" },
          { x: "20mm", y: "-28mm" },
        ]}
      />
      <pcbnotedimension
        layer="top"
        from={{ x: -20, y: -38 }}
        to={{ x: 20, y: -38 }}
        text="40mm"
        font="tscircuit2024"
        fontSize="1.2mm"
        arrowSize="1mm"
        color="rgba(255, 165, 0, 0.9)"
      />
    </board>,
  )

  const circuitJson = circuit.getCircuitJson()
  console.log(JSON.stringify(circuitJson, null, 2))
  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer
        circuitJson={circuitJson as AnyCircuitElement[]}
        height={800}
        initialState={{
          is_showing_copper_pours: true,
          is_showing_solder_mask: true,
          is_showing_pcb_groups: true,
          is_showing_group_anchor_offsets: true,
        }}
      />
    </div>
  )
}

export default AllFeaturesExample
