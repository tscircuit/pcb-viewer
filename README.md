# Return-current simulation service

Deployed API: **https://return-current-simulation-service.seve.workers.dev/api**.

Runs Palace EM jobs through a Cloudflare Worker and Container, with durable inputs and results in R2. The recommended standalone repository name is `tscircuit/return-current-simulation-service`.

## Sign in and deploy with Wrangler

The existing service was deployed with Wrangler OAuth login. Use an account with Workers Paid and R2 enabled, and start Docker on the computer running Wrangler.

Run these commands from this repository's root:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run typecheck:container
bun run test
bunx wrangler login --device --browser=false \
  --scopes account:read user:read workers:write workers_scripts:write \
  workers_tail:read containers:write cloudchamber:write artifacts:write
```

These are the scopes used for the successful deployment. Follow Wrangler's printed device authorization instructions and select the intended account. `--browser=false` supports a terminal that cannot launch a browser; omit it when Wrangler can open the browser on your computer. Credentials stay in Wrangler's local login configuration.

Create the configured R2 bucket once on a new account, then deploy:

```sh
bunx wrangler r2 bucket create return-current-simulation-jobs
bun run deploy
```

Skip bucket creation when it already exists. `bun run deploy` builds and pushes the `linux/amd64` Palace image using Docker, then deploys the Worker and Container configuration. The Docker build context is this repository root. Initial image provisioning may take several minutes after the Worker URL appears. The configuration remains portable between accounts.

Use `VITE_RETURN_CURRENT_API_URL=https://return-current-simulation-service.seve.workers.dev/api` to connect the viewer to the existing service. Add any new frontend origin to `ALLOWED_ORIGINS` as a complete origin before deploying a configuration change.

[Service architecture, API and limits](services/return-current/README.md) are preserved from PCBViewer. Run this exported repository's commands from its root; the linked source document retains PCBViewer's directory-specific deployment paths. Worker binding smoke checks use `bunx wrangler dev --config wrangler.smoke.jsonc`; that configuration deliberately fails the job without running EM.

Source: [standalone template](https://github.com/tscircuit/pcb-viewer/tree/return-current-service-template). The service and shared native runner retain the PCBViewer source layout.

Deployment references: [Wrangler login](https://developers.cloudflare.com/workers/wrangler/commands/general/#login), [Deploy Containers](https://developers.cloudflare.com/containers/guides/deploy/), [R2 setup](https://developers.cloudflare.com/r2/get-started/).
