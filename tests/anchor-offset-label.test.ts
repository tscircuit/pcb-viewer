import { expect, test } from "bun:test"
import { formatOffsetLabel } from "../src/components/AnchorOffsetOverlay/common/format-offset-label"

test("anchor offset labels do not duplicate the mm unit", () => {
  expect(formatOffsetLabel("5mm", 5)).toBe("5mm")
  expect(formatOffsetLabel("-7.00mm", -7)).toBe("-7.00mm")
  expect(formatOffsetLabel("Δx: 5.00mm", 5)).toBe("Δx: 5.00mm")
  expect(formatOffsetLabel(5 as any, 5)).toBe("5mm")
  expect(formatOffsetLabel(undefined, 1.234)).toBe("1.23mm")
})
