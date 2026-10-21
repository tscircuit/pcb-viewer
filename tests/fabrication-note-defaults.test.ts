import { expect, test } from "bun:test"
import { createStore } from "../src/global-store"

test("fabrication notes are opt-in and preserve visibility choices", () => {
  expect(createStore().getState().is_showing_fabrication_notes).toBe(false)
  expect(
    createStore({ is_showing_fabrication_notes: false }).getState()
      .is_showing_fabrication_notes,
  ).toBe(false)
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window")
  const storageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  )
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} })
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  })
  try {
    expect(createStore().getState().is_showing_fabrication_notes).toBe(false)
    createStore().getState().setIsShowingFabricationNotes(false)
    expect(createStore().getState().is_showing_fabrication_notes).toBe(false)
    createStore().getState().setIsShowingFabricationNotes(true)
    expect(createStore().getState().is_showing_fabrication_notes).toBe(true)
  } finally {
    if (windowDescriptor)
      Object.defineProperty(globalThis, "window", windowDescriptor)
    else Reflect.deleteProperty(globalThis, "window")
    if (storageDescriptor)
      Object.defineProperty(globalThis, "localStorage", storageDescriptor)
    else Reflect.deleteProperty(globalThis, "localStorage")
  }
})
