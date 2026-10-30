import { expect } from "bun:test"
import type { Page } from "playwright"

export async function expectBoardFraming(
  page: Page,
  expected: { width: number; height: number },
) {
  await page.waitForFunction((expected) => {
    const bounds = window.pcbViewportTest.getPaintedBoardBounds()
    return (
      bounds &&
      Math.abs((bounds.minX + bounds.maxX) / 2 - 400) < 2 &&
      Math.abs((bounds.minY + bounds.maxY) / 2 - 300) < 2 &&
      // Painted bounds include the outline stroke and antialiasing.
      Math.abs(bounds.maxX - bounds.minX - expected.width) < 4 &&
      Math.abs(bounds.maxY - bounds.minY - expected.height) < 4
    )
  }, expected)
  const bounds = await page.evaluate(() =>
    window.pcbViewportTest.getPaintedBoardBounds(),
  )
  expect(bounds).not.toBeNull()
  expect(bounds!.minX).toBeGreaterThan(0)
  expect(bounds!.minY).toBeGreaterThan(0)
  expect(bounds!.maxX).toBeLessThan(800)
  expect(bounds!.maxY).toBeLessThan(600)
}
