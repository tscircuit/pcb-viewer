import { test } from "bun:test"
import { checkFirstZoom } from "./first-zoom/check-first-zoom"

test("first zoom retains the deferred Sitara fit", checkFirstZoom, 60_000)
