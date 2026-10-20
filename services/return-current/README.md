# Return-current simulation service

Deployed API: **https://return-current-simulation-service.seve.workers.dev/api**.

This service runs the same native Palace EM solver used by the local viewer. It is a deployment prototype in PCBViewer; it can be exported to `tscircuit/return-current-simulation-service`. It does not require a CLI process on the viewer user's computer.

## Sign in and deploy with Wrangler

The existing service was deployed through Wrangler OAuth login. For another deployment, use an account with Workers Paid and R2 enabled, and start Docker on the computer running Wrangler. The recommended standalone repository name is `tscircuit/return-current-simulation-service`.

From this directory, install and check the service, then sign in with the scopes used by the successful deployment:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run typecheck:container
bun run test
bunx wrangler login --device --browser=false \
  --scopes account:read user:read workers:write workers_scripts:write \
  workers_tail:read containers:write cloudchamber:write artifacts:write
```

Follow the device authorization instructions Wrangler prints and select the intended account. `--browser=false` supports a terminal that cannot launch a browser; omit that option when Wrangler can open the browser on your computer. Credentials stay in Wrangler's local login configuration.

Create the configured R2 bucket once on a new account, then deploy:

```sh
bunx wrangler r2 bucket create return-current-simulation-jobs
bun run deploy
```

Skip bucket creation when it already exists. `bun run deploy` uses Docker to build the `linux/amd64` Palace image, pushes the image, and deploys the Worker and Container configuration. `image_build_context: "../.."` intentionally uses the PCBViewer repository root so the Dockerfile can copy the shared native runner. The canonical configuration is portable between accounts. An initial deployment may spend several minutes building and provisioning the image.

`wrangler.jsonc` already allows the exact PCBViewer feature-branch preview origin and explicit localhost ports. Add any new frontend origin to `ALLOWED_ORIGINS` as a complete origin; wildcards and reflected origins are not used. Set the frontend's `VITE_RETURN_CURRENT_API_URL` to **`https://return-current-simulation-service.seve.workers.dev/api`** for the existing service, or another deployed Worker URL including `/api`, then rebuild the preview. No manually configured application secret is needed: private per-job container tokens are generated and stored by the coordinator.

## Architecture and limits

A Worker exposes the browser API. A singleton SQLite Durable Object owns a bounded queue and polls the native job using durable alarms. Each job gets its own Container Durable Object and private token. The native image contains Palace, Gmsh, Python and the simulator; there is no Docker daemon inside the deployed container and internet access is disabled. Inputs, public status and completed Circuit JSON are stored in R2. Closing the page does not cancel a job. A restarted container can be retried once from the stored input; a native solver failure remains failed.

Initial image provisioning or temporary capacity/rate limits (HTTP 503/429) wait within the same job's original deadline. They do not start another native job or reset its runtime budget.

The configured `standard-4` instance provides **12 GiB RAM, 4 vCPU and 20 GB disk**, with at most one running container. The queue accepts four waiting jobs and 24 new jobs per UTC day; jobs have a 15-minute deadline. Cloudflare Containers require the Workers Paid plan and incur usage charges. These are bounded public preview limits, not user authentication: exact CORS origins restrict browser access, while non-browser callers can still submit jobs against the same global budget.

Set an R2 lifecycle expiration appropriate for your data retention and costs. R2 objects use `jobs/<request_id>/input.json`, `status.json`, and `result.circuit.json`; Circuit JSON may contain the supplied PCB. Request IDs should be unguessable (the browser uses UUIDs). Result access is by request ID, with no public listing endpoint. This prototype is intended for public example PCBs; authenticated access should be added before accepting private customer boards. Durable Object metadata currently persists until the service is removed.

## API

- `GET /api/health` reports queue capacity. It does not cold-start a paid container or claim a native readiness probe was executed.
- `POST /api/events/create` accepts the existing `REQUEST_RETURN_CURRENT_SIMULATION` JSON schema and returns HTTP 202 with `accepted`, `request_id` and job status. Reusing the same ID and definition is idempotent; changing its definition returns 409.
- `GET /api/jobs/<request_id>` returns `{job}` including a durable `queued`, `running`, `completed` or `failed` status. This survives browser closure and Worker/container restarts.
- `GET /api/files/get?file_path=return-current/<id>/result.circuit.json` returns the browser client's `{file:{file_path,content}}` JSON envelope only after the result is stored. Download escaping streams with backpressure; cancellation stops the R2 read.

Requests are limited to 8 MiB and a 400 mm² crop (100 mm maximum side, at most 2000 outline vertices), positive board thickness at most 5 mm, one million samples at pitch at least 0.005 mm, mesh size 0.25–4 mm, and air padding at most 5 mm. The actual outline bounds are checked as well as nominal dimensions. Results are limited to 32 MiB. The native simulator still validates physical geometry, contacts, supported layers, surface-impedance validity, and solver outputs. Unsupported physics produces a failed job; this service does not substitute approximations or fabricate a completed field.

The internal container protocol is `POST /jobs {request,timeout_ms}`, `GET /jobs/<id>`, and `GET /jobs/<id>/result` (raw JSON array), authenticated with its per-job bearer token. A completed result is committed to R2 before the container is destroyed. Child-process group deadlines also terminate Python/MPI descendants if the native supervisor times out.

## Local checks

`bun run test` checks protocol limits, concurrent queue transitions, failure and timeout handling, restart recovery, durable result ordering, exact CORS, and result-stream cancellation. These tests use an injected transport and do not claim to run EM.

To exercise real local Worker bindings, SQLite Durable Objects, R2, and alarms without starting a solver:

```sh
bunx wrangler dev --config wrangler.smoke.jsonc --port 8787 --persist-to .wrangler/protocol-smoke
```

The smoke-only internal object accepts a job and then deliberately reports `failed` with `Protocol smoke only: no EM solver was executed`. It never creates a successful simulation or heat map. Submit a minimal API request, wait for that terminal status, stop Wrangler, restart with the same persistence directory, and verify the same status and daily budget. The production entry point and container are separate from this failure-only smoke configuration.

References: [Container sizes and limits](https://developers.cloudflare.com/containers/platform/limits/), [Container SDK](https://developers.cloudflare.com/containers/container-package/), [Wrangler container configuration](https://developers.cloudflare.com/containers/wrangler-configuration/).
