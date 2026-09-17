import { createRoot } from "react-dom/client"
// Exercise the published bundle, including its embedded worker, rather than Vite's worker loader.
import { PCBViewer } from "../../dist/index.js"

const root = createRoot(document.getElementById("viewer")!)
const circuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 0, y: 0 },
    width: 50,
    height: 40,
    num_layers: 2,
    thickness: 1.6,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad",
    shape: "rect",
    x: 0,
    y: 0,
    width: 4,
    height: 3,
    layer: "top",
  },
] as any
const stats = { created: 0, terminated: 0, images: 0 }
const OriginalWorker = window.Worker
window.Worker = class extends OriginalWorker {
  constructor(...args: ConstructorParameters<typeof Worker>) {
    super(...args)
    stats.created++
    this.addEventListener("message", ({ data }) => {
      if (data.type === "image") stats.images++
    })
  }
  terminate() {
    stats.terminated++
    super.terminate()
  }
}
Object.assign(window, {
  componentValidation: {
    stats,
    mount: (workerCount?: number) =>
      root.render(
        <PCBViewer
          circuitJson={circuitJson}
          allowEditing={false}
          renderOptions={{ workerCount }}
        />,
      ),
    unmount: () => root.unmount(),
  },
})
