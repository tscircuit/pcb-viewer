import { createRoot } from "react-dom/client"
import { PCBViewer } from "../../src/index"
import { scene } from "./scene"

const params = new URLSearchParams(location.search)
createRoot(document.getElementById("root")!).render(
  <PCBViewer
    circuitJson={scene}
    renderer={params.has("gpu") ? "webgpu" : "canvas"}
    height={600}
    initialState={{
      is_showing_solder_mask: false,
    }}
  />,
)
