import { test } from "bun:test"
import { expectExampleArtwork } from "./example-circuit-json/expect-example-artwork"

test("the transform example renders its initial and added components", async () => {
  await expectExampleArtwork({ fixture: "transform", addComponents: 3 })
}, 60_000)
