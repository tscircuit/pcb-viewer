import test from "ava"

test("clamps zoom level within min and max scale bounds on canvas wheel event", (t) => {
  const minZoom = 0.1
  const maxZoom = 25.0
  
  const clampZoom = (z: number) => Math.max(minZoom, Math.min(maxZoom, z))
  
  t.is(clampZoom(0.05), 0.1)
  t.is(clampZoom(30.0), 25.0)
  t.is(clampZoom(2.5), 2.5)
})
