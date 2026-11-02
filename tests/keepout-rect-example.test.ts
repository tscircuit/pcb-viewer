import { test } from "bun:test"
import { expectExampleArtwork } from "./example-circuit-json/expect-example-artwork"

test("the rect keepout example renders its artwork", async () => {
  await expectExampleArtwork({ fixture: "keepout_rect" })
}, 60_000)
