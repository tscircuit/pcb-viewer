import test from "ava"

test("toggles layer visibility and computes effective alpha transparency", (t) => {
  const layers = {
    "top_copper": { visible: true, opacity: 0.8 },
    "bottom_copper": { visible: true, opacity: 0.6 },
    "silkscreen": { visible: false, opacity: 1.0 }
  }
  
  const getRenderAlpha = (layerName: keyof typeof layers) => {
    const l = layers[layerName]
    return l.visible ? l.opacity : 0.0
  }
  
  t.is(getRenderAlpha("top_copper"), 0.8)
  t.is(getRenderAlpha("bottom_copper"), 0.6)
  t.is(getRenderAlpha("silkscreen"), 0.0)
})
