import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("PCBViewer focusOnHover prop (#163)", () => {
  const rootDir = join(import.meta.dir, "..")
  const pcbViewerSource = readFileSync(join(rootDir, "src/PCBViewer.tsx"), "utf8")
  const dimensionOverlaySource = readFileSync(
    join(rootDir, "src/components/DimensionOverlay.tsx"),
    "utf8",
  )
  const hoverFixtureSource = readFileSync(
    join(rootDir, "src/examples/2025/hover-behavior.fixture.tsx"),
    "utf8",
  )

  test("removes legacy disableAutoFocus prop in favor of focusOnHover={false}", () => {
    expect(pcbViewerSource).not.toContain("disableAutoFocus?:")
    expect(pcbViewerSource).toContain("focusOnHover?: boolean")
    expect(pcbViewerSource).toContain("focusOnHover = false")
  })

  test("DimensionOverlay defaults focusOnHover to false and only focuses container when focusOnHover is true", () => {
    expect(dimensionOverlaySource).toContain("focusOnHover = false")
    expect(dimensionOverlaySource).toContain("data-focus-on-hover={focusOnHover ? \"true\" : \"false\"}")
    expect(dimensionOverlaySource).toContain("if (focusOnHover && containerRef.current)")
  })

  test("hover-behavior fixture demonstrates both focusOnHover={false} and focusOnHover={true}", () => {
    expect(hoverFixtureSource).toContain("focusOnHover={false}")
    expect(hoverFixtureSource).toContain("focusOnHover={true}")
  })
})
