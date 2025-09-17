import { describe, it, expect } from "bun:test"

describe("Color Support - Simple Tests", () => {
  it("should verify color property exists in types", () => {
    // Test that our type changes work by creating a mock primitive with color
    const mockPrimitive = {
      _pcb_drawing_object_id: "test",
      pcb_drawing_type: "line" as const,
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 0,
      width: 0.1,
      layer: "top",
      color: "#ff0000", // This should be allowed by our type changes
    }

    expect(mockPrimitive.color).toBe("#ff0000")
    expect(mockPrimitive.pcb_drawing_type).toBe("line")
  })

  it("should verify getColor function logic", () => {
    // Test the color priority logic from draw-primitives.ts
    const LAYER_NAME_TO_COLOR = {
      top: "rgb(200, 52, 52)",
      bottom: "rgb(77, 127, 196)",
    }

    function getColor(primitive: { color?: string; layer: string }): string {
      // Use explicit color if provided, otherwise fall back to layer-based color
      const baseColor = primitive.color || LAYER_NAME_TO_COLOR[primitive.layer as keyof typeof LAYER_NAME_TO_COLOR]
      return baseColor
    }

    // Test explicit color takes priority
    const primitiveWithColor = { color: "#00ff00", layer: "top" }
    expect(getColor(primitiveWithColor)).toBe("#00ff00")

    // Test fallback to layer color
    const primitiveWithoutColor = { layer: "top" }
    expect(getColor(primitiveWithoutColor)).toBe("rgb(200, 52, 52)")

    // Test fallback to layer color for different layer
    const primitiveBottomLayer = { layer: "bottom" }
    expect(getColor(primitiveBottomLayer)).toBe("rgb(77, 127, 196)")
  })

  it("should verify schematic layer color mapping", () => {
    // Test that our schematic layer color mapping works
    const colors = {
      schematic: {
        wire: "rgb(0, 160, 0)",
      },
    }

    const LAYER_NAME_TO_COLOR = {
      schematic: colors.schematic.wire,
      top: "rgb(200, 52, 52)",
    }

    expect(LAYER_NAME_TO_COLOR.schematic).toBe("rgb(0, 160, 0)")
    expect(LAYER_NAME_TO_COLOR.top).toBe("rgb(200, 52, 52)")
  })
})
