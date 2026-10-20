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
const deployUrl = `https://deploy.workers.cloudflare.com/?url=${encodeURIComponent(sourceUrl)}`
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

Runs Palace EM jobs through a Cloudflare Worker and Container, with durable inputs and results in R2.

Publish this exported directory at the [public template source](${sourceUrl}) first. The deploy link requires that source repository and branch to exist.

[Deploy to Cloudflare](${deployUrl})

The button copies this public template into your GitHub or GitLab account and lets you choose the new repository name, such as \`return-current-simulation-service\`. Sign in to Cloudflare there and approve its setup. It provisions the declared R2 bucket and Durable Objects. Containers require the Workers Paid plan; enable the R2 subscription on the target account.

For direct Git import, open Workers & Pages → Create application → GitHub, select the repository and branch containing this exported root, and set the production deploy command to \`bun run deploy\`. Ensure the bucket named in \`wrangler.jsonc\` exists when using direct Git import.

Local validation: \`bun install --frozen-lockfile\`, \`bun run typecheck\`, \`bun run typecheck:container\`, and \`bun run test\`. Local deployment requires Docker and Cloudflare login: \`bunx wrangler login\`, then \`bun run deploy\`.

Worker binding smoke checks use \`bunx wrangler dev --config wrangler.smoke.jsonc\`; that configuration deliberately fails the job without running EM. [Service architecture, API and limits](services/return-current/README.md) are preserved from PCBViewer. Run this exported repository's commands from its root; the linked source document retains PCBViewer's directory-specific deployment paths.

The Container uses a \`linux/amd64\` image. The Docker build context is this repository root. Initial image provisioning may take several minutes after the Worker URL appears.

Source: exported from PCBViewer's \`services/return-current\` and shared \`scripts/return-current\` native runner/protocol. No PCBViewer frontend or credentials are included.

Deployment references: [Deploy buttons](https://developers.cloudflare.com/workers/platform/deploy-buttons/), [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [Deploy Containers](https://developers.cloudflare.com/containers/guides/deploy/).
`,
  )
  // Refuse a non-empty destination instead of overwriting another checkout.
  await rename(staging, destination)
  console.log(`Exported standalone service to ${destination}`)
} catch (error) {
  await rm(staging, { recursive: true, force: true })
  throw error
}
