export const throttleAnimationFrame = <Args extends unknown[]>(
  fn: (...args: Args) => void,
) => {
  let frameId: number | null = null
  let lastArgs: Args

  const invoke = () => {
    frameId = null
    fn(...lastArgs)
  }

  return (...args: Args) => {
    lastArgs = args
    if (frameId === null) {
      frameId = window.requestAnimationFrame(invoke)
    }
  }
}
