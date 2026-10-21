import { expect, it } from "bun:test"
import {
  RETURN_CURRENT_TAILWIND_CDN,
  scopeReturnCurrentTailwindSelector,
} from "../../src/lib/return-current-tailwind"

it("pins the lazy Tailwind runtime and scopes default rules without changing generated utility selectors", () => {
  expect(RETURN_CURRENT_TAILWIND_CDN).toBe("https://cdn.tailwindcss.com/3.4.17")
  expect(scopeReturnCurrentTailwindSelector("*, ::before, ::after")).toBe(
    "[data-return-current-dialog], [data-return-current-dialog] *, [data-return-current-dialog]::before, [data-return-current-dialog] ::before, [data-return-current-dialog]::after, [data-return-current-dialog] ::after",
  )
  expect(scopeReturnCurrentTailwindSelector("::backdrop")).toBe(
    "[data-return-current-dialog]::backdrop, [data-return-current-dialog] ::backdrop",
  )
  const utility = ":is([data-return-current-dialog] .rctw-bg-white)"
  expect(scopeReturnCurrentTailwindSelector(utility)).toBe(utility)
})
