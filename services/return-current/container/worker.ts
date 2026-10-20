import { readFile, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { runNativeSimulation } from "../../../scripts/return-current/native-runner"
import { simulationRequestSchema } from "../../../scripts/return-current/protocol"

// A separate process gives the HTTP supervisor a Linux process group containing
// the complete Bun -> Python/MPI -> Palace tree, which it can kill on deadline.
if (import.meta.main) {
  const [requestPath, directory] = process.argv.slice(2)
  if (!requestPath || !directory)
    throw new Error("Missing server-selected job paths")
  try {
    const request = simulationRequestSchema.parse(
      JSON.parse(await readFile(requestPath, "utf8")),
    )
    const result = await runNativeSimulation(request, directory)
    const temporary = join(directory, "result.circuit.json.tmp")
    await writeFile(temporary, JSON.stringify(result))
    await rename(temporary, join(directory, "result.circuit.json"))
    process.exit(0)
  } catch (error) {
    const message = (
      error instanceof Error ? error.message : String(error)
    ).slice(0, 2048)
    await writeFile(
      join(directory, "failure.json"),
      JSON.stringify({ message }),
    ).catch(() => {})
    console.error(message)
    process.exit(1)
  }
}
