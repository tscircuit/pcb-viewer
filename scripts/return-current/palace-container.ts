#!/usr/bin/env bun
export {}

// Optional compatibility launcher for virtual CPUs affected by old hwloc's
// x86 CPUID divide-by-zero bug. Linux topology, the solver and model are retained.
// https://github.com/open-mpi/hwloc/commit/33b555b5a1c8339daeb4215bad57430b57a6b33f
const solver = Bun.spawn(
  [
    "docker",
    "run",
    "--rm",
    "--network",
    "none",
    "--user",
    `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--env",
    "HWLOC_COMPONENTS=-x86",
    "--mount",
    `type=bind,src=${process.cwd()},dst=/case`,
    "--workdir",
    "/case",
    "benvial/palace@sha256:f0f3a3cbbdf1ee2d8f856ddbe1f5bf4628a92ee8ab87d1e27dc33402ad9c8dda",
    "palace",
    ...process.argv.slice(2),
  ],
  { stdin: "ignore", stdout: "inherit", stderr: "inherit" },
)
process.exit(await solver.exited)
