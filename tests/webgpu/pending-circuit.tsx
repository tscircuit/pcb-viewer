import { Circuit } from "@tscircuit/core"

export async function createPendingCircuit(secondScene = false) {
  const circuit = new Circuit()
  circuit.add(
    <board width="40mm" height="30mm" routingDisabled>
      <resistor name="R1" resistance="1k" footprint="0603" pcbX={-4} />
      {secondScene && (
        <resistor name="R2" resistance="1k" footprint="0603" pcbX={4} />
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
