import { test } from "bun:test"
import { expectExampleArtwork } from "./example-circuit-json/expect-example-artwork"

test("the circle keepout example renders its artwork", async () => {
  await expectExampleArtwork({ fixture: "keepout_circle" })
}, 60_000)
