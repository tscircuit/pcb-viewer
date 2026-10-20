# Native Palace container

This HTTP supervisor runs the existing `scripts/return-current/native-runner.ts` in a child process. Palace executes directly inside the container; Docker is not needed inside it. A Cloudflare coordinator submits one job, polls its status, and copies the completed Circuit JSON into R2 before stopping the container.

Build from the repository root:

```sh
docker build -f services/return-current/container/Dockerfile -t return-current-native:local .
```

In a managed environment with a proxy CA, add `--secret id=proxy_ca,src="$CODEX_PROXY_CERT"`. TLS verification stays enabled; the optional certificate is mounted during dependency installation and is not saved in an image layer. The Dockerfile-specific ignore file keeps the build context small.

The image pins the Palace v0.14.0 image digest, Bun 1.3.5 image digest, simulator preview commit, and Python numerical dependencies. CPython 3.12.10 is compiled against the same Ubuntu 22.04 base and its source SHA-256 is checked against the published Python release digest. This avoids copying a newer-glibc Python binary into the Palace image. Production dependencies use the included lockfile; the required prebuilt Resvg binding does not require installation scripts.

The runtime uses an unprivileged user and the following server-controlled configuration:

- `RETURN_CURRENT_CONTAINER_TOKEN`: required, injected by the Container Durable Object for its job.
- `RETURN_CURRENT_MAX_RUNTIME_MS`: maximum accepted job deadline; default 20 minutes. The Worker sets 15 minutes.
- `RETURN_CURRENT_JOB_ROOT`: writable job directory; default `/work/jobs`.
- `PORT`: HTTP port; default `8080`.
- `PALACE_BIN` and `PALACE_PYTHON`: native executable paths set by the image.
- `HWLOC_COMPONENTS=-x86`: avoids an old hwloc divide-by-zero on inconsistent virtual-machine CPUID topology while retaining Linux topology discovery.

`GET /health` returns minimal process health. All job endpoints require `Authorization: Bearer <container token>`:

| Route | Contract |
| --- | --- |
| `POST /jobs` | `{ "request": <existing SimulationRequest>, "timeout_ms": <bounded remaining duration> }`; returns `202` with `request_id` and status. |
| `GET /jobs/:id` | `{ "job": { "request_id", "status", "message", ... } }`. |
| `GET /jobs/:id/result` | Completed official Circuit JSON array, `application/json`, with `Content-Length`. |

One immutable job is accepted per container. Repeating its ID and content returns its current status; a different ID or changed request receives `409`. No caller can choose executables or filesystem paths. Requests are limited to 32 MiB, results to 32 MiB. A deadline freezes and walks the native process tree before killing its descendants and original process group. This also catches MPI ranks that start new sessions; it does not merely abandon a promise. The HTTP supervisor remains available to report failure. A restart marks an interrupted local job as failed.

Input, status, result, and solver evidence remain in the server-selected job directory. These local files are temporary; the Worker/R2 layer owns durable results and browser reconnects. The current simulator adapter accepts surface-impedance copper and has no fabrication-stackup input, so its supported case is a two-layer board with a bottom reference plane. Unsupported layouts fail explicitly and are not rewritten.

Run the supervisor lifecycle test from the repository root:

```sh
bun x tsc -p services/return-current/container/tsconfig.json
bun test services/return-current/container/server.test.ts
```

This test checks authentication, immutable requests, deadlines, and actual detached-descendant termination without producing artificial EM fields. Validate the built image separately with a real Palace job; algebraic solver convergence is not a claim of mesh or current-density convergence.
