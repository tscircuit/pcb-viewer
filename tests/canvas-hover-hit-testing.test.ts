import test from "ava"

test("detects mouse hover hit within pad bounding box tolerance threshold", (t) => {
  const pad = { x: 15.0, y: 20.0, width: 2.0, height: 2.0 }
  const mousePos = { x: 15.5, y: 19.8 }
  
  const isHit = (
    mousePos.x >= (pad.x - pad.width / 2) &&
    mousePos.x <= (pad.x + pad.width / 2) &&
    mousePos.y >= (pad.y - pad.height / 2) &&
    mousePos.y <= (pad.y + pad.height / 2)
  )
  
  t.true(isHit)
})
