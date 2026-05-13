import { Circuit } from "@tscircuit/core"
import { PCBViewer } from "../../PCBViewer"

export const BasicRectangleBoard = () => {
  const circuit = new Circuit()

  circuit.add(<board width="10mm" height="10mm" />)

  const soup = circuit.getCircuitJson()

  return (
    <div>
      <PCBViewer soup={soup} />
    </div>
  )
}

export const TriangleBoard = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm" outline={[
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 },
    ]} />,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div>
      <PCBViewer soup={soup} />
    </div>
  )
}

export const OctagonBoard = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm" outline={[
      { x: 3, y: 0 },
      { x: 7, y: 0 },
      { x: 10, y: 3 },
      { x: 10, y: 7 },
      { x: 7, y: 10 },
      { x: 3, y: 10 },
      { x: 0, y: 7 },
      { x: 0, y: 3 },
    ]} />,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div>
      <PCBViewer soup={soup} />
    </div>
  )
}

export const AtariBoard = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm" outline={[
      { x: 0, y: 2 },
      { x: 2, y: 0 },
      { x: 8, y: 0 },
      { x: 10, y: 2 },
      { x: 10, y: 8 },
      { x: 8, y: 10 },
      { x: 2, y: 10 },
      { x: 0, y: 8 },
    ]} />,
  )

  const soup = circuit.getCircuitJson()

  return (
    <div>
      <PCBViewer soup={soup} />
    </div>
  )
}

export const BoardWithFocusOnHoverDisabled = () => {
  const circuit = new Circuit()

  circuit.add(<board width="10mm" height="10mm" />)

  const soup = circuit.getCircuitJson()

  return (
    <div>
      <PCBViewer soup={soup} focusOnHover={false} />
    </div>
  )
}

export default {
  BasicRectangleBoard,
  TriangleBoard,
  OctagonBoard,
  AtariBoard,
  BoardWithFocusOnHoverDisabled,
}
