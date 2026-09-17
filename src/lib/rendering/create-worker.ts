/** Load worker code lazily so importing the viewer during SSR needs no worker loader. */
export const createRenderWorker = async () => {
  const { default: RenderWorker } = await import(
    "./pcb-render.worker?worker&inline"
  )
  return new RenderWorker()
}
