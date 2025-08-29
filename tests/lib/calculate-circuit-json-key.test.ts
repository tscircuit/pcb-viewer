import { describe, it, expect } from "bun:test"
import { calculateCircuitJsonKey } from "../../src/lib/calculate-circuit-json-key"
import type { AnyCircuitElement } from "circuit-json"

describe("calculateCircuitJsonKey", () => {
  describe("empty and null inputs", () => {
    it("should return '0' for undefined input", () => {
      const result = calculateCircuitJsonKey(undefined)
      expect(result).toBe("0")
    })

    it("should return '0' for empty array", () => {
      const result = calculateCircuitJsonKey([])
      expect(result).toBe("0")
    })

    it("should return '0' for null input", () => {
      const result = calculateCircuitJsonKey(null as any)
      expect(result).toBe("0")
    })
  })

  describe("non-PCB elements filtering", () => {
    it("should ignore non-PCB elements and return '0'", () => {
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "source_component",
          source_component_id: "comp1",
          name: "R1",
        } as any,
        {
          type: "schematic_component",
          schematic_component_id: "sch1",
        } as any,
      ]

      const result = calculateCircuitJsonKey(circuitJson)
      expect(result).toBe("0")
    })

    it("should process only PCB elements when mixed with non-PCB elements", () => {
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "source_component",
          source_component_id: "comp1",
          name: "R1",
        } as any,
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad1",
          pcb_component_id: "comp1",
          shape: "rect",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          layer: "top",
        } as any,
      ]

      const result = calculateCircuitJsonKey(circuitJson)
      expect(result).toMatch(/^1_[a-z0-9]+$/)
    })
  })

  describe("single PCB element", () => {
    it("should generate consistent key for single pcb_smtpad", () => {
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad1",
          pcb_component_id: "comp1",
          shape: "rect",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          layer: "top",
        } as any,
      ]

      const result = calculateCircuitJsonKey(circuitJson)
      expect(result).toMatch(/^1_[a-z0-9]+$/)

      // Should be consistent across multiple calls
      const result2 = calculateCircuitJsonKey(circuitJson)
      expect(result).toBe(result2)
    })

    it("should generate key for pcb_trace", () => {
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "pcb_trace",
          pcb_trace_id: "trace1",
          route: [
            { x: 0, y: 0, width: 0.1 },
            { x: 1, y: 1, width: 0.1 },
          ],
          layer: "top",
        } as any,
      ]

      const result = calculateCircuitJsonKey(circuitJson)
      expect(result).toMatch(/^1_[a-z0-9]+$/)
    })
  })

  describe("multiple PCB elements", () => {
    it("should generate consistent key for multiple elements", () => {
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad1",
          pcb_component_id: "comp1",
          shape: "rect",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          layer: "top",
        } as any,
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad2",
          pcb_component_id: "comp2",
          shape: "rect",
          x: 2,
          y: 2,
          width: 1,
          height: 1,
          layer: "top",
        } as any,
      ]

      const result = calculateCircuitJsonKey(circuitJson)
      expect(result).toMatch(/^2_[a-z0-9]+$/)

      // Should be consistent across multiple calls
      const result2 = calculateCircuitJsonKey(circuitJson)
      expect(result).toBe(result2)
    })

    it("should include element count in the key", () => {
      const singleElement: AnyCircuitElement[] = [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad1",
          pcb_component_id: "comp1",
          shape: "rect",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          layer: "top",
        } as any,
      ]

      const multipleElements: AnyCircuitElement[] = [
        ...singleElement,
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad2",
          pcb_component_id: "comp2",
          shape: "rect",
          x: 2,
          y: 2,
          width: 1,
          height: 1,
          layer: "top",
        } as any,
      ]

      const singleResult = calculateCircuitJsonKey(singleElement)
      const multipleResult = calculateCircuitJsonKey(multipleElements)

      expect(singleResult).toMatch(/^1_/)
      expect(multipleResult).toMatch(/^2_/)
      expect(singleResult).not.toBe(multipleResult)
    })
  })

  describe("element ordering consistency", () => {
    it("should produce same key regardless of element order", () => {
      const element1 = {
        type: "pcb_smtpad",
        pcb_smtpad_id: "pad1",
        pcb_component_id: "comp1",
        shape: "rect",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        layer: "top",
      } as any

      const element2 = {
        type: "pcb_smtpad",
        pcb_smtpad_id: "pad2",
        pcb_component_id: "comp2",
        shape: "rect",
        x: 2,
        y: 2,
        width: 1,
        height: 1,
        layer: "top",
      } as any

      const circuitJson1 = [element1, element2]
      const circuitJson2 = [element2, element1]

      const result1 = calculateCircuitJsonKey(circuitJson1)
      const result2 = calculateCircuitJsonKey(circuitJson2)

      expect(result1).toBe(result2)
    })
  })

  describe("bounds and precision handling", () => {
    it("should handle elements with different positions but same bounds", () => {
      const element1 = {
        type: "pcb_smtpad",
        pcb_smtpad_id: "pad1",
        pcb_component_id: "comp1",
        shape: "rect",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        layer: "top",
      } as any

      const element2 = {
        type: "pcb_smtpad",
        pcb_smtpad_id: "pad2",
        pcb_component_id: "comp2",
        shape: "rect",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        layer: "top",
      } as any

      const result1 = calculateCircuitJsonKey([element1])
      const result2 = calculateCircuitJsonKey([element2])

      // Different IDs should produce different keys even with same bounds
      expect(result1).not.toBe(result2)
    })

    it("should handle precise decimal positions", () => {
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad1",
          pcb_component_id: "comp1",
          shape: "rect",
          x: 0.123456789,
          y: 0.987654321,
          width: 1.111111111,
          height: 2.222222222,
          layer: "top",
        } as any,
      ]

      const result = calculateCircuitJsonKey(circuitJson)
      expect(result).toMatch(/^1_[a-z0-9]+$/)
    })
  })

  describe("identical circuit JSON", () => {
    it("should produce identical keys for identical circuit JSON", () => {
      const createCircuitJson = () => [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad1",
          pcb_component_id: "comp1",
          shape: "rect",
          x: 1.5,
          y: 2.5,
          width: 1,
          height: 1,
          layer: "top",
        } as any,
        {
          type: "pcb_trace",
          pcb_trace_id: "trace1",
          route: [
            { x: 0, y: 0, width: 0.1 },
            { x: 3, y: 3, width: 0.1 },
          ],
          layer: "top",
        } as any,
      ]

      const circuitJson1 = createCircuitJson()
      const circuitJson2 = createCircuitJson()

      const result1 = calculateCircuitJsonKey(circuitJson1)
      const result2 = calculateCircuitJsonKey(circuitJson2)

      expect(result1).toBe(result2)
    })
  })

  describe("different circuit types", () => {
    it("should handle various PCB element types", () => {
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad1",
          pcb_component_id: "comp1",
          shape: "rect",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          layer: "top",
        } as any,
        {
          type: "pcb_plated_hole",
          pcb_plated_hole_id: "hole1",
          shape: "circle",
          x: 2,
          y: 2,
          outer_diameter: 1,
          hole_diameter: 0.5,
          layers: ["top", "bottom"],
        } as any,
        {
          type: "pcb_via",
          pcb_via_id: "via1",
          x: 4,
          y: 4,
          outer_diameter: 0.8,
          hole_diameter: 0.4,
          layers: ["top", "bottom"],
        } as any,
      ]

      const result = calculateCircuitJsonKey(circuitJson)
      expect(result).toMatch(/^3_[a-z0-9]+$/)
    })
  })

  describe("edge cases", () => {
    it("should handle elements without explicit IDs", () => {
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "pcb_smtpad",
          shape: "rect",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          layer: "top",
        } as any,
      ]

      const result = calculateCircuitJsonKey(circuitJson)
      expect(result).toMatch(/^1_[a-z0-9]+$/)
    })

    it("should handle malformed elements gracefully", () => {
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad1",
          // Missing required properties
        } as any,
        {
          type: "pcb_trace",
          pcb_trace_id: "trace1",
          route: [],
          layer: "top",
        } as any,
      ]

      const result = calculateCircuitJsonKey(circuitJson)
      expect(typeof result).toBe("string")
    })
  })

  describe("key format validation", () => {
    it("should always return string in format 'count_hash'", () => {
      const circuitJson: AnyCircuitElement[] = [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad1",
          pcb_component_id: "comp1",
          shape: "rect",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          layer: "top",
        } as any,
      ]

      const result = calculateCircuitJsonKey(circuitJson)
      const parts = result.split("_")

      expect(parts).toHaveLength(2)
      expect(parseInt(parts[0])).toBeGreaterThan(0)
      expect(parts[1]).toMatch(/^[a-z0-9]+$/)
    })

    it("should produce different hashes for different circuits", () => {
      const circuitJson1: AnyCircuitElement[] = [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad1",
          pcb_component_id: "comp1",
          shape: "rect",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          layer: "top",
        } as any,
      ]

      const circuitJson2: AnyCircuitElement[] = [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "pad1",
          pcb_component_id: "comp1",
          shape: "rect",
          x: 5, // Different position
          y: 5,
          width: 1,
          height: 1,
          layer: "top",
        } as any,
      ]

      const result1 = calculateCircuitJsonKey(circuitJson1)
      const result2 = calculateCircuitJsonKey(circuitJson2)

      expect(result1).not.toBe(result2)

      // Both should have same count but different hash
      const [count1, hash1] = result1.split("_")
      const [count2, hash2] = result2.split("_")

      expect(count1).toBe(count2)
      expect(hash1).not.toBe(hash2)
    })
  })
})
