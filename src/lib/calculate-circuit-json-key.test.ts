import { describe, expect, it, vi, beforeEach } from "vitest"
import { calculateCircuitJsonKey } from "./calculate-circuit-json-key"

vi.mock("@tscircuit/soup-util", () => {
  return {
    getElementId: (elm: any) => elm.mockId ?? elm.pcb_component_id ?? elm.id,
    getBoundsOfPcbElements: (elements: any[]) => {
      const e = elements[0]
      // Provide a deterministic bounds implementation based on element fields
      const minX = e.minX ?? e.x - (e.width ?? 0) / 2 ?? 0
      const minY = e.minY ?? e.y - (e.height ?? 0) / 2 ?? 0
      const maxX = e.maxX ?? e.x + (e.width ?? 0) / 2 ?? 0
      const maxY = e.maxY ?? e.y + (e.height ?? 0) / 2 ?? 0
      return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
    },
  }
})

describe("calculateCircuitJsonKey", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns '0' for empty or undefined input", () => {
    expect(calculateCircuitJsonKey(undefined as any)).toBe("0")
    expect(calculateCircuitJsonKey([] as any)).toBe("0")
    expect(
      calculateCircuitJsonKey([{ type: "source_project_metadata" } as any]),
    ).toBe("0")
  })

  it("produces a stable key for same elements regardless of order", () => {
    const a = {
      type: "pcb_component",
      mockId: "A",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
    }
    const b = {
      type: "pcb_component",
      mockId: "B",
      x: 10,
      y: 0,
      width: 2,
      height: 2,
    }

    const key1 = calculateCircuitJsonKey([a as any, b as any])
    const key2 = calculateCircuitJsonKey([b as any, a as any])
    expect(key1).toBe(key2)
  })

  it("changes when geometry changes", () => {
    const c1 = {
      type: "pcb_component",
      mockId: "C",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
    }
    const c2 = { ...c1, x: 1 } // move element

    const k1 = calculateCircuitJsonKey([c1 as any])
    const k2 = calculateCircuitJsonKey([c2 as any])
    expect(k1).not.toBe(k2)
  })

  it("ignores non-pcb_ elements", () => {
    const pcb = {
      type: "pcb_component",
      mockId: "pcb",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
    }
    const nonPcb = { type: "source_project_metadata" }
    const kOnlyPcb = calculateCircuitJsonKey([pcb as any])
    const kWithNonPcb = calculateCircuitJsonKey([nonPcb as any, pcb as any])
    expect(kOnlyPcb).toBe(kWithNonPcb)
  })
})


