import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { ContextProviders } from "../src/components/ContextProviders"
import { DimensionOverlay } from "../src/components/DimensionOverlay"

test("DimensionOverlay renders with focusOnHover={false} default and explicit prop", () => {
  const defaultHtml = renderToStaticMarkup(
    <ContextProviders>
      <DimensionOverlay>
        <div>child</div>
      </DimensionOverlay>
    </ContextProviders>,
  )
  const explicitFalseHtml = renderToStaticMarkup(
    <ContextProviders>
      <DimensionOverlay focusOnHover={false}>
        <div>child</div>
      </DimensionOverlay>
    </ContextProviders>,
  )
  expect(defaultHtml).toContain("<div>child</div>")
  expect(explicitFalseHtml).toBe(defaultHtml)
})
