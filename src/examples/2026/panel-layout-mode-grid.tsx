import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../../PCBViewer"

// Simple board with corner holes and a center note
const SmallBoard = ({ label }: { label: string }) => (
  <board width={10} height={10}>
    <platedhole
      name="H1"
      pcbX={-3}
      pcbY={-3}
      holeDiameter={1}
      outerDiameter={1.5}
      shape="circle"
    />
    <platedhole
      name="H2"
      pcbX={3}
      pcbY={-3}
      holeDiameter={1}
      outerDiameter={1.5}
      shape="circle"
    />
    <platedhole
      name="H3"
      pcbX={3}
      pcbY={3}
      holeDiameter={1}
      outerDiameter={1.5}
      shape="circle"
    />
    <platedhole
      name="H4"
      pcbX={-3}
      pcbY={3}
      holeDiameter={1}
      outerDiameter={1.5}
      shape="circle"
    />
    <pcbnotetext pcbX={0} pcbY={0} text={label} fontSize={2} />
  </board>
)

// Board with a named group containing components - this group SHOULD be visible
const BoardWithGroup = ({ label }: { label: string }) => (
  <board width={10} height={10}>
    <group name="PowerSection" width={10} height={10} pcbX={0} pcbY={0}></group>
    <pcbnotetext pcbX={0} pcbY={-3} text={label} fontSize={1.5} />
  </board>
)

// Wider board variant
const WideBoard = ({ label }: { label: string }) => (
  <board width={20} height={10}>
    <platedhole
      name="H1"
      pcbX={-8}
      pcbY={-3}
      holeDiameter={1}
      outerDiameter={1.5}
      shape="circle"
    />
    <platedhole
      name="H2"
      pcbX={8}
      pcbY={-3}
      holeDiameter={1}
      outerDiameter={1.5}
      shape="circle"
    />
    <platedhole
      name="H3"
      pcbX={8}
      pcbY={3}
      holeDiameter={1}
      outerDiameter={1.5}
      shape="circle"
    />
    <platedhole
      name="H4"
      pcbX={-8}
      pcbY={3}
      holeDiameter={1}
      outerDiameter={1.5}
      shape="circle"
    />
    <pcbnotetext pcbX={0} pcbY={0} text={label} fontSize={2} />
  </board>
)

export const PanelLayoutModeGrid: React.FC = () => {
  const circuit = new Circuit()

  circuit.add(
    <panel width={80} height={60} layoutMode="grid">
      <subpanel>
        <SmallBoard label="A1" />
      </subpanel>
      <subpanel>
        <SmallBoard label="A2" />
      </subpanel>
      <subpanel>
        <WideBoard label="B1" />
      </subpanel>
      <subpanel>
        <BoardWithGroup label="A3+Group" />
      </subpanel>
      <subpanel>
        <WideBoard label="B2" />
      </subpanel>
      <subpanel>
        <SmallBoard label="A4" />
      </subpanel>
    </panel>,
  )

  const circuitJson = circuit.getCircuitJson()

  return (
    <div style={{ backgroundColor: "black" }}>
      <PCBViewer circuitJson={circuitJson} />
    </div>
  )
}

export default PanelLayoutModeGrid
