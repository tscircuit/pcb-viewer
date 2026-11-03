import { test } from "bun:test"
import { checkFirstZoom } from "./first-zoom/check-first-zoom"

test.failing(
  "first zoom retains the deferred Sitara fit",
  checkFirstZoom,
  60_000,
)
