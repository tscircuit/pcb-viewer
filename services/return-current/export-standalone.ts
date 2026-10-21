import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

// Preserve the native runner's relative imports and Docker COPY paths.
// bun services/return-current/export-standalone.ts <new destination directory> [public source URL]
const serviceRoot = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(serviceRoot, "../..")
if (!process.argv[2])
  throw new Error(
    "Usage: bun services/return-current/export-standalone.ts <new destination directory> [public source URL]",
  )
const destination = resolve(process.argv[2])
const sourceUrl =
  process.argv[3] ??
  "https://github.com/tscircuit/return-current-simulation-service"
if (
  destination === repositoryRoot ||
  destination.startsWith(`${repositoryRoot}/`)
)
  throw new Error("Export to a new directory outside the PCBViewer repository.")

const readJson = async (path: string) =>
  JSON.parse(await readFile(path, "utf8"))
const packageJson = await readJson(join(serviceRoot, "package.json"))
const repositoryPackage = await readJson(join(repositoryRoot, "package.json"))
const wrangler = await readJson(join(serviceRoot, "wrangler.jsonc"))
const smokeWrangler = await readJson(join(serviceRoot, "wrangler.smoke.jsonc"))
const tsconfig = await readJson(join(serviceRoot, "tsconfig.json"))
const servicePath = "services/return-current"

wrangler.main = `${servicePath}/worker/index.ts`
smokeWrangler.main = `${servicePath}/worker/smoke-entry.ts`
for (const container of wrangler.containers) {
  container.image = `${servicePath}/container/Dockerfile`
  container.image_build_context = "."
}
packageJson.scripts.test = `bun test ${servicePath}/worker`
packageJson.license = repositoryPackage.license ?? "MIT"
packageJson.scripts["typecheck:container"] =
  `tsc -p ${servicePath}/container/tsconfig.json`
tsconfig.include = [`${servicePath}/worker/**/*.ts`]
tsconfig.exclude = [
  `${servicePath}/worker/**/*.test.ts`,
  "node_modules",
  `${servicePath}/container`,
]

await mkdir(dirname(destination), { recursive: true })
const staging = await mkdtemp(
  join(dirname(destination), ".return-current-service-export-"),
)
try {
  for (const directory of ["worker", "container"]) {
    await cp(
      join(serviceRoot, directory),
      join(staging, servicePath, directory),
      {
        recursive: true,
        filter: (path) => {
          const name = path.slice(path.lastIndexOf("/") + 1)
          return !name.startsWith(".") && name !== "node_modules"
        },
      },
    )
  }
  for (const file of ["native-runner.ts", "protocol.ts"]) {
    const relative = join("scripts/return-current", file)
    await mkdir(dirname(join(staging, relative)), { recursive: true })
    await cp(join(repositoryRoot, relative), join(staging, relative))
  }
  await cp(join(serviceRoot, "bun.lock"), join(staging, "bun.lock"))
  await cp(join(repositoryRoot, "LICENSE"), join(staging, "LICENSE"))
  await cp(
    join(serviceRoot, "README.md"),
    join(staging, servicePath, "README.md"),
  )
  for (const [file, value] of [
    ["package.json", packageJson],
    ["wrangler.jsonc", wrangler],
    ["wrangler.smoke.jsonc", smokeWrangler],
    ["tsconfig.json", tsconfig],
  ] as const)
    await writeFile(join(staging, file), `${JSON.stringify(value, null, 2)}\n`)
  await writeFile(
    join(staging, ".gitignore"),
    "node_modules/\n.wrangler/\ndist/\n.env*\n.dev.vars*\n",
  )
  await writeFile(
    join(staging, "README.md"),
    `# Return-current simulation service

Deployed API: **https://return-current-simulation-service.seve.workers.dev/api**.

Runs Palace EM jobs through a Cloudflare Worker and Container, with durable inputs and results in R2. The recommended standalone repository name is \`tscircuit/return-current-simulation-service\`.

## Sign in and deploy with Wrangler

The existing service was deployed with Wrangler OAuth login. Use an account with Workers Paid and R2 enabled, and start Docker on the computer running Wrangler.

Run these commands from this repository's root:

\`\`\`sh
bun install --frozen-lockfile
bun run typecheck
bun run typecheck:container
bun run test
bunx wrangler login --device --browser=false \\
  --scopes account:read user:read workers:write workers_scripts:write \\
  workers_tail:read containers:write cloudchamber:write artifacts:write
\`\`\`

These are the scopes used for the successful deployment. Follow Wrangler's printed device authorization instructions and select the intended account. \`--browser=false\` supports a terminal that cannot launch a browser; omit it when Wrangler can open the browser on your computer. Credentials stay in Wrangler's local login configuration.

Create the configured R2 bucket once on a new account, then deploy:

\`\`\`sh
bunx wrangler r2 bucket create return-current-simulation-jobs
bun run deploy
\`\`\`

Skip bucket creation when it already exists. \`bun run deploy\` builds and pushes the \`linux/amd64\` Palace image using Docker, then deploys the Worker and Container configuration. The Docker build context is this repository root. Initial image provisioning may take several minutes after the Worker URL appears. The configuration remains portable between accounts.

Use \`VITE_RETURN_CURRENT_API_URL=https://return-current-simulation-service.seve.workers.dev/api\` to connect the viewer to the existing service. Add any new frontend origin to \`ALLOWED_ORIGINS\` as a complete origin before deploying a configuration change.

[Service architecture, API and limits](services/return-current/README.md) are preserved from PCBViewer. Run this exported repository's commands from its root; the linked source document retains PCBViewer's directory-specific deployment paths. Worker binding smoke checks use \`bunx wrangler dev --config wrangler.smoke.jsonc\`; that configuration deliberately fails the job without running EM.

Source: [standalone template](${sourceUrl}). The service and shared native runner retain the PCBViewer source layout.

Deployment references: [Wrangler login](https://developers.cloudflare.com/workers/wrangler/commands/general/#login), [Deploy Containers](https://developers.cloudflare.com/containers/guides/deploy/), [R2 setup](https://developers.cloudflare.com/r2/get-started/).
`,
  )
  // Refuse a non-empty destination instead of overwriting another checkout.
  await rename(staging, destination)
  console.log(`Exported standalone service to ${destination}`)
} catch (error) {
  await rm(staging, { recursive: true, force: true })
  throw error
}
