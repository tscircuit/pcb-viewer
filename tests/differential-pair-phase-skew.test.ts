import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"

test("the View menu toggles phase skew and preserves it across renderers", async () => {
  // Give the GPU browser its own process, independent of other Playwright tests.
  const script = fileURLToPath(
    new URL("./webgpu/check-phase-skew.ts", import.meta.url),
  )
  const browserCheck = Bun.spawn([Bun.argv[0], script], {
    stdout: "pipe",
    stderr: "pipe",
    signal: AbortSignal.timeout(50_000),
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    browserCheck.exited,
    new Response(browserCheck.stdout).text(),
    new Response(browserCheck.stderr).text(),
  ])
  expect(
    exitCode,
    `${stdout}
${stderr}`,
  ).toBe(0)
}, 60_000)
