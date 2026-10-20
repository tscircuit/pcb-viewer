// Local binding/alarm smoke only. This deliberately reports failure and never
// creates a fabricated successful simulation or a field result.
import { DurableObject } from "cloudflare:workers"
import { json } from "./protocol"
export { ReturnCurrentCoordinator } from "./index"
export { default } from "./index"

export class ProtocolSmokeContainer extends DurableObject {
  async fetch(request: Request) {
    const path = new URL(request.url).pathname
    if (path === "/jobs" && request.method === "POST") {
      const body = (await request.json()) as { request: { request_id: string } }
      await this.ctx.storage.put("request-id", body.request.request_id)
      return json(
        { request_id: body.request.request_id, status: "running" },
        202,
      )
    }
    if (path === "/_control/stop") return json({ stopped: true })
    const id = await this.ctx.storage.get<string>("request-id")
    return id
      ? json({
          job: {
            request_id: id,
            status: "failed",
            message: "Protocol smoke only: no EM solver was executed",
          },
        })
      : json({ error: "not started" }, 404)
  }
}
