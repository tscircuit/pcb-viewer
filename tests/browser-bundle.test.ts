import { expect, test } from "bun:test"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

test("the release bundle leaves React and React DOM to the consuming app", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "pcb-viewer-bundle-"))
  try {
    // Exercise the release command: CLI options can override tsup.config.ts.
    const build = Bun.spawn(["bun", "run", "build", "--out-dir", outDir], {
      cwd: join(import.meta.dir, ".."),
      stdout: "pipe",
      stderr: "pipe",
    })
    const [exitCode, stdout, stderr] = await Promise.all([
      build.exited,
      new Response(build.stdout).text(),
      new Response(build.stderr).text(),
    ])
    expect(exitCode, `${stdout}\n${stderr}`).toBe(0)

    const bundle = await readFile(join(outDir, "index.js"), "utf8")
    const sourceMap = JSON.parse(
      await readFile(join(outDir, "index.js.map"), "utf8"),
    )
    expect(bundle).toMatch(
      /import\s*\{[^}]*createPortal[^}]*\}\s*from "react-dom"/,
    )
    expect(bundle).not.toMatch(/\b(?:__require|require)\(["']react["']\)/)
    expect(
      sourceMap.sources.filter((source: string) =>
        /node_modules\/react(?:-dom)?\//.test(source),
      ),
    ).toEqual([])
  } finally {
    await rm(outDir, { recursive: true, force: true })
  }
}, 120_000)
