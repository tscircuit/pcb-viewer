import { resolve, sep } from "node:path"

const registryUrl = "https://api.tscircuit.com"
const packageName = "0hmX/am3352-ddr-track-a-local-dfm-wip-20261007"
// The v0.0.17 source used for the original DDR fixture, not the latest build.
const releaseId = "6d1b4222-3307-42ec-bf51-812174fe55cc"

export async function fetchAm3352Source(sourceDir: string): Promise<{
  entry: string
  assetUrls: Record<string, string>
}> {
  const listUrl = new URL("/package_files/list", registryUrl)
  listUrl.search = new URLSearchParams({
    package_name: packageName,
    package_release_id: releaseId,
  }).toString()
  const listResponse = await fetch(listUrl, {
    signal: AbortSignal.timeout(30_000),
  })
  if (!listResponse.ok) {
    throw new Error(`Could not list AM3352 source: HTTP ${listResponse.status}`)
  }
  const { package_files: releaseFiles } = (await listResponse.json()) as {
    package_files: {
      file_path: string
      package_release_id: string
      package_file_id: string
    }[]
  }
  const sourceFiles = releaseFiles.filter(({ file_path }) =>
    /\.(tsx?|json|step|glb)$/.test(file_path),
  )
  if (!sourceFiles.some(({ file_path }) => file_path === "index.tsx")) {
    throw new Error("AM3352 release is missing index.tsx")
  }

  const assetUrls: Record<string, string> = Object.create(null)
  // Ignore documentation and tooling files. The board imports STEP and GLB assets.
  for (let offset = 0; offset < sourceFiles.length; offset += 16) {
    const results = await Promise.allSettled(
      sourceFiles.slice(offset, offset + 16).map(async (file) => {
        const destination = resolve(sourceDir, file.file_path)
        if (
          !destination.startsWith(sourceDir + sep) ||
          file.package_release_id !== releaseId
        ) {
          throw new Error(`Unexpected AM3352 source path: ${file.file_path}`)
        }
        if (/\.(step|glb)$/.test(file.file_path)) {
          const modelUrl = new URL("/package_files/download", registryUrl)
          modelUrl.searchParams.set("package_file_id", file.package_file_id)
          const model = await fetch(modelUrl, {
            signal: AbortSignal.timeout(30_000),
          })
          if (!model.ok) {
            throw new Error(
              `Could not download ${file.file_path}: HTTP ${model.status}`,
            )
          }
          await Bun.write(destination, model)
          assetUrls[destination] = modelUrl.href
          return
        }
        const fileUrl = new URL("/package_files/get", registryUrl)
        fileUrl.search = new URLSearchParams({
          package_release_id: releaseId,
          file_path: file.file_path,
        }).toString()
        const response = await fetch(fileUrl, {
          signal: AbortSignal.timeout(30_000),
        })
        if (!response.ok) {
          throw new Error(
            `Could not fetch ${file.file_path}: HTTP ${response.status}`,
          )
        }
        const { package_file: source } = (await response.json()) as {
          package_file: {
            package_release_id: string
            file_path: string
            content_text: string | null
          }
        }
        if (
          source.package_release_id !== releaseId ||
          source.file_path !== file.file_path ||
          typeof source.content_text !== "string"
        ) {
          throw new Error(
            `Unexpected AM3352 source response for ${file.file_path}`,
          )
        }
        await Bun.write(destination, source.content_text)
      }),
    )
    for (const result of results) {
      if (result.status === "rejected") throw result.reason
    }
  }
  return { entry: resolve(sourceDir, "index.tsx"), assetUrls }
}
