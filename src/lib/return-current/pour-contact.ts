import type {
  AnyCircuitElement,
  PcbPort,
  SimulationReturnCurrentContact,
} from "circuit-json"

type Point = { x: number; y: number; bulge?: number }
const inside = (p: Point, ring: readonly Point[]) => {
  if (ring.some((v) => Math.abs(v.bulge ?? 0) > 1e-12))
    throw new Error(
      "Ground-pour contacts currently require straight polygon edges.",
    )
  let result = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j]
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      result = !result
  }
  return result
}

/** Identify existing copper beneath a signal pad. The native mesher also checks
 * drilled clearances and the complete port aperture against every conductor. */
export function getReturnCurrentPourContact(
  circuit: readonly AnyCircuitElement[],
  pourId: string,
  groundId: string,
  signal: PcbPort,
): SimulationReturnCurrentContact {
  const pour = circuit.find(
    (e) => e.type === "pcb_copper_pour" && e.pcb_copper_pour_id === pourId,
  )
  if (
    !pour ||
    pour.type !== "pcb_copper_pour" ||
    pour.source_net_id !== groundId ||
    signal.layers.includes(pour.layer)
  )
    throw new Error(
      "Choose an existing ground pour on a different layer from both signal pads.",
    )
  const outer =
    pour.shape === "rect"
      ? [
          {
            x: pour.center.x - pour.width / 2,
            y: pour.center.y - pour.height / 2,
          },
          {
            x: pour.center.x + pour.width / 2,
            y: pour.center.y - pour.height / 2,
          },
          {
            x: pour.center.x + pour.width / 2,
            y: pour.center.y + pour.height / 2,
          },
          {
            x: pour.center.x - pour.width / 2,
            y: pour.center.y + pour.height / 2,
          },
        ]
      : pour.shape === "polygon"
        ? pour.points
        : pour.brep_shape.outer_ring.vertices
  const holes =
    pour.shape === "brep"
      ? pour.brep_shape.inner_rings.map((r) => r.vertices)
      : []
  if (!inside(signal, outer) || holes.some((r) => inside(signal, r)))
    throw new Error(
      "The selected ground pour does not cover both signal pads. Choose another pour or physical ground pads.",
    )
  return {
    contact_type: "pcb_copper_pour",
    pcb_copper_pour_id: pourId,
    x: signal.x,
    y: signal.y,
    layer: pour.layer,
  }
}
