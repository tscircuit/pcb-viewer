import { expect, test } from "bun:test"
import { createStore } from "../src/global-store"

test("PCB notes are shown by default and can be hidden", () => {
  const store = createStore()

  expect(store.getState().is_showing_pcb_notes).toBe(true)

  store.getState().setIsShowingPcbNotes(false)

  expect(store.getState().is_showing_pcb_notes).toBe(false)
})

test("DRC warnings are shown by default and can be hidden", () => {
  const store = createStore()

  expect(store.getState().is_showing_drc_warnings).toBe(true)

  store.getState().setIsShowingDrcWarnings(false)

  expect(store.getState().is_showing_drc_warnings).toBe(false)
})

test("hidden layer opacity stays set when selecting another layer", () => {
  const store = createStore()
  store.getState().setHiddenLayerOpacity(0)
  store.getState().selectLayer("inner6")
  expect(store.getState().hidden_layer_opacity).toBe(0)
  store.getState().setHiddenLayerOpacity(1)
  expect(store.getState().hidden_layer_opacity).toBe(1)
})

test("hidden layer opacity defaults to 20% without browser storage", () => {
  expect(createStore().getState().hidden_layer_opacity).toBe(0.2)
})

test("hidden layer visibility is restored for a new viewer", () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window")
  const storageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  )
  const values = new Map<string, string>()
  const key = "pcb_viewer_hidden_layer_opacity"
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  })
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  })
  try {
    expect(createStore().getState().hidden_layer_opacity).toBe(0.2)
    for (const opacity of [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1]) {
      createStore().getState().setHiddenLayerOpacity(opacity)
      expect(values.get(key)).toBe(JSON.stringify(opacity))
      expect(createStore().getState().hidden_layer_opacity).toBe(opacity)
    }
    for (const invalid of ["invalid", "null", '"0.4"', "true", "{}", "1e400"]) {
      values.set(key, invalid)
      expect(createStore().getState().hidden_layer_opacity).toBe(0.2)
    }
    for (const [input, expected] of [
      [-1, 0],
      [2, 1],
    ]) {
      values.set(key, JSON.stringify(input))
      expect(createStore().getState().hidden_layer_opacity).toBe(expected)
      createStore().getState().setHiddenLayerOpacity(input)
      expect(values.get(key)).toBe(JSON.stringify(expected))
    }
    const store = createStore()
    store.getState().setHiddenLayerOpacity(0.6)
    for (const invalid of [NaN, Infinity, -Infinity]) {
      store.getState().setHiddenLayerOpacity(invalid)
      expect(store.getState().hidden_layer_opacity).toBe(0.6)
      expect(values.get(key)).toBe("0.6")
    }
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("Storage unavailable")
      },
    })
    const unavailableStore = createStore()
    expect(unavailableStore.getState().hidden_layer_opacity).toBe(0.2)
    unavailableStore.getState().setHiddenLayerOpacity(0.8)
    expect(unavailableStore.getState().hidden_layer_opacity).toBe(0.8)
  } finally {
    if (windowDescriptor)
      Object.defineProperty(globalThis, "window", windowDescriptor)
    else Reflect.deleteProperty(globalThis, "window")
    if (storageDescriptor)
      Object.defineProperty(globalThis, "localStorage", storageDescriptor)
    else Reflect.deleteProperty(globalThis, "localStorage")
  }
})
