# Return-current simulation service

Runs Palace EM jobs through a Cloudflare Worker and Container, with durable inputs and results in R2.

Publish this exported directory at the [public template source](https://github.com/tscircuit/pcb-viewer/tree/return-current-service-template) first. The deploy link requires that source repository and branch to exist.

[Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Ftscircuit%2Fpcb-viewer%2Ftree%2Freturn-current-service-template)

The button copies this public template into your GitHub or GitLab account and lets you choose the new repository name, such as `return-current-simulation-service`. Sign in to Cloudflare there and approve its setup. It provisions the declared R2 bucket and Durable Objects. Containers require the Workers Paid plan; enable the R2 subscription on the target account.

For direct Git import, open Workers & Pages → Create application → GitHub, select the repository and branch containing this exported root, and set the production deploy command to `bun run deploy`. Ensure the bucket named in `wrangler.jsonc` exists when using direct Git import.

Local validation: `bun install --frozen-lockfile`, `bun run typecheck`, `bun run typecheck:container`, and `bun run test`. Local deployment requires Docker and Cloudflare login: `bunx wrangler login`, then `bun run deploy`.

Worker binding smoke checks use `bunx wrangler dev --config wrangler.smoke.jsonc`; that configuration deliberately fails the job without running EM. [Service architecture, API and limits](services/return-current/README.md) are preserved from PCBViewer. Run this exported repository's commands from its root; the linked source document retains PCBViewer's directory-specific deployment paths.

The Container uses a `linux/amd64` image. The Docker build context is this repository root. Initial image provisioning may take several minutes after the Worker URL appears.

Source: exported from PCBViewer's `services/return-current` and shared `scripts/return-current` native runner/protocol. No PCBViewer frontend or credentials are included.

Deployment references: [Deploy buttons](https://developers.cloudflare.com/workers/platform/deploy-buttons/), [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [Deploy Containers](https://developers.cloudflare.com/containers/guides/deploy/).
