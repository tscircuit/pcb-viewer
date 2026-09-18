export const createWebGpuWorker = async () => {
  const { default: WorkerConstructor } = await import(
    "./pcb-webgpu.worker?worker&inline"
  )
  return new WorkerConstructor()
}
