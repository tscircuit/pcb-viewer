import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { build, preview } from "vite"

const root = fileURLToPath(new URL("../../", import.meta.url))
const require = createRequire(import.meta.url)
const browser = await chromium.launch({ headless: true })
try {
  for (const host of ["runframe", "tscircuit.com"]) {
    const hostRoot = resolve(
      process.env.PCB_SEARCH_HOSTS_ROOT ?? resolve(root, ".."),
      host,
    )
    const wrapper = resolve(
      hostRoot,
      host === "runframe"
        ? "lib/components/PcbViewerWithContainerHeight.tsx"
        : "src/components/PcbViewerWithContainerHeight.tsx",
    )
    assert(
      existsSync(wrapper),
      `Check out ${host} alongside pcb-viewer or set PCB_SEARCH_HOSTS_ROOT`,
    )
    const hostRequire = createRequire(resolve(hostRoot, "package.json"))
    const tailwind = hostRequire("tailwindcss")
    const outDir = resolve(root, "work", "component-search-hosts", host)
    await build({
      configFile: false,
      root: resolve(root, "tests/component-search-hosts"),
      logLevel: "error",
      css: {
        postcss: {
          plugins: [
            tailwind({
              content: [resolve(root, "tests/component-search-hosts/main.tsx")],
              corePlugins: { preflight: true },
            }),
          ],
        },
      },
      resolve: {
        alias: [
          { find: "host-pcb-wrapper", replacement: wrapper },
          {
            find: "@tscircuit/pcb-viewer",
            replacement: resolve(root, "dist/index.js"),
          },
          {
            find: /^react-dom(?=\/|$)/,
            replacement: dirname(require.resolve("react-dom/package.json")),
          },
          {
            find: /^react(?=\/|$)/,
            replacement: dirname(require.resolve("react/package.json")),
          },
        ],
      },
      build: { outDir, emptyOutDir: true, minify: true },
    })
    const server = await preview({
      configFile: false,
      root,
      build: { outDir },
      preview: { host: "127.0.0.1", port: 0 },
      logLevel: "error",
    })
    try {
      for (const width of [900, 375]) {
        const page = await browser.newPage({ viewport: { width, height: 800 } })
        page.setDefaultTimeout(10000)
        const errors: string[] = []
        page.on("pageerror", (error) => errors.push(error.message))
        await page.goto(
          `${server.resolvedUrls!.local[0]}${host === "tscircuit.com" ? "?clickToInteract" : ""}`,
        )
        if (host === "tscircuit.com")
          await page
            .getByText(/^(Click|Touch) to Interact$/)
            .locator("..")
            .click()
        const search = page.getByRole("button", { name: "Search components" })
        await search.click()
        const input = page.getByRole("textbox", { name: "Component name" })
        await input.click()
        await page.keyboard.type("u1")
        assert.equal(await input.inputValue(), "u1")
        await page.getByRole("button", { name: "U1 bottom" }).click()
        const outline = page.locator(
          '[data-focused-pcb-component-id="component"]',
        )
        await outline.waitFor()
        await page.waitForTimeout(550)
        const bounds = (await outline.boundingBox())!
        assert(
          Math.abs(bounds.x + bounds.width / 2 - width / 2) < 1,
          "centered in host",
        )
        assert(bounds.width < width * 0.5, "contextual zoom")
        await outline.waitFor({ state: "detached", timeout: 4000 })
        await search.click()
        await input.press("Escape")
        assert.equal(await input.count(), 0)
        assert.deepEqual(errors, [])
        await page.close()
        console.log(`${host}: production wrapper search passes at ${width}px`)
      }
    } finally {
      await new Promise<void>((resolve) =>
        server.httpServer.close(() => resolve()),
      )
    }
  }
} finally {
  await browser.close()
}
