import { expect, test } from "bun:test"

test("reports a pending WebGPU scene until its first frame", async () => {
  const run = Bun.spawn(["bun", "run", "test:webgpu-pending"], {
    cwd: `${import.meta.dir}/..`,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    run.exited,
    new Response(run.stdout).text(),
    new Response(run.stderr).text(),
  ])
  expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
}, 120_000)
